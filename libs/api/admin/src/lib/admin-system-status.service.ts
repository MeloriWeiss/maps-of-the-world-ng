import { Inject, Injectable } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStorage } from '@wm/api/shared';
import { Prisma, PrismaMainService } from '@wm/api/database-main';

type SystemResourceStatus = 'available' | 'unavailable';

interface SystemResourceCheck {
  status: SystemResourceStatus;
  responseTimeMs: number;
}

@Injectable()
export class AdminSystemStatusService {
  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStorage,
  ) {}

  async getStatus() {
    const [database, storage] = await Promise.all([
      this.#check(() => this.prisma.$queryRaw(Prisma.sql`SELECT 1`)),
      this.#check(() => this.objectStorage.checkAvailability()),
    ]);

    return {
      status:
        database.status === 'available' && storage.status === 'available'
          ? 'available'
          : 'degraded',
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version:
        process.env['APP_VERSION'] ??
        process.env['npm_package_version'] ??
        'development',
      resources: { database, objectStorage: storage },
    };
  }

  async #check(
    operation: () => Promise<unknown>,
  ): Promise<SystemResourceCheck> {
    const startedAt = Date.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('System resource check timed out')),
            3000,
          );
        }),
      ]);
      return { status: 'available', responseTimeMs: Date.now() - startedAt };
    } catch {
      return { status: 'unavailable', responseTimeMs: Date.now() - startedAt };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
