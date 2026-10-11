import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { OBJECT_STORAGE, ObjectStorage } from '@wm/api/shared';

@Injectable()
export class TextureBlobCleanupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  #logger = new Logger(TextureBlobCleanupService.name);
  #timer: ReturnType<typeof setInterval> | null = null;
  #running = false;

  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onApplicationBootstrap() {
    void this.#sweep().catch(() =>
      this.#logger.warn('Texture cleanup will be retried'),
    );
    this.#timer = setInterval(() => {
      void this.#sweep().catch(() =>
        this.#logger.warn('Texture cleanup will be retried'),
      );
    }, 10 * 60_000);
    this.#timer.unref();
  }

  onModuleDestroy() {
    if (this.#timer) clearInterval(this.#timer);
  }

  async #sweep() {
    if (this.#running) return;
    this.#running = true;
    try {
      const textures = await this.prisma.texture.findMany({
        where: { deletedAt: { not: null }, sceneReferences: { none: {} } },
        orderBy: { deletedAt: 'asc' },
        take: 20,
        select: { id: true, objectKey: true },
      });
      for (const texture of textures) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const deleted = await tx.texture.deleteMany({
              where: {
                id: texture.id,
                deletedAt: { not: null },
                sceneReferences: { none: {} },
              },
            });
            if (!deleted.count) return;
            await tx.textureBlobCleanup.upsert({
              where: { objectKey: texture.objectKey },
              create: {
                objectKey: texture.objectKey,
                notBefore: new Date(Date.now() + 300_000),
              },
              update: {},
            });
          });
        } catch {
          this.#logger.warn('A texture cleanup will be retried');
        }
      }
      await this.prisma.texturePack.deleteMany({
        where: { deletedAt: { not: null }, textures: { none: {} } },
      });
      const blobs = await this.prisma.textureBlobCleanup.findMany({
        where: { notBefore: { lte: new Date() } },
        orderBy: { notBefore: 'asc' },
        take: 20,
      });
      for (const blob of blobs) {
        try {
          await this.storage.delete(blob.objectKey);
          await this.prisma.textureBlobCleanup.deleteMany({
            where: { objectKey: blob.objectKey },
          });
        } catch {
          this.#logger.warn('A texture file cleanup will be retried');
        }
      }
    } finally {
      this.#running = false;
    }
  }
}
