import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaMainService } from '@wm/api/database-main';
import { OBJECT_STORAGE, ObjectStorage } from '@wm/api/shared';
import { lockSceneCommit } from './scene-commit-lock';

/** Ставит удаление временных бинарных данных сцены в очередь. */
export async function queueSceneBlobCleanup(
  tx: Prisma.TransactionClient,
  keys: readonly string[],
  delayMs = 300_000,
) {
  if (!keys.length) return;
  const notBefore = new Date(Date.now() + delayMs);
  await tx.mapSceneBlobCleanup.createMany({
    data: keys.map((objectKey) => ({ objectKey, notBefore })),
    skipDuplicates: true,
  });
  await tx.mapSceneBlobCleanup.updateMany({
    where: { objectKey: { in: [...keys] }, notBefore: { gt: notBefore } },
    data: { notBefore },
  });
}

/** Удаляет устаревшие бинарные данные сцен из хранилища. */
@Injectable()
export class SceneBlobCleanupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  #logger = new Logger(SceneBlobCleanupService.name);
  #timer: ReturnType<typeof setInterval> | null = null;
  #running = false;

  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onApplicationBootstrap() {
    this.#timer = setInterval(() => {
      void this.#sweep().catch(() =>
        this.#logger.warn('Map preview cleanup will be retried'),
      );
    }, 60_000);
    this.#timer.unref();
  }

  onModuleDestroy() {
    if (this.#timer) clearInterval(this.#timer);
  }

  async #sweep() {
    if (this.#running) return;
    this.#running = true;
    try {
      const expired = await this.prisma.mapSceneCommit.findMany({
        where: { status: 'uploading', expiresAt: { lt: new Date() } },
        take: 10,
        select: { id: true, mapId: true, accountId: true },
      });
      for (const item of expired)
        await this.prisma.$transaction(async (tx) => {
          const commit = await lockSceneCommit(
            tx,
            item.mapId,
            item.accountId,
            item.id,
          );
          if (commit.status !== 'uploading' || commit.expiresAt >= new Date())
            return;
          await tx.$executeRaw`
          INSERT INTO "map_scene_blob_cleanup" ("object_key", "not_before")
          SELECT "object_key", NOW() + INTERVAL '5 minutes' FROM "map_scene_commit_tiles"
          WHERE "commit_id" = ${item.id} AND "object_key" IS NOT NULL
          ON CONFLICT ("object_key") DO NOTHING`;
          await tx.mapSceneCommitPage.deleteMany({
            where: { commitId: item.id },
          });
          await tx.mapSceneCommitTile.deleteMany({
            where: { commitId: item.id },
          });
          await tx.mapSceneCommit.update({
            where: { id: item.id },
            data: { status: 'expired' },
          });
        });
      const candidates = await this.prisma.mapSceneBlobCleanup.findMany({
        where: { notBefore: { lte: new Date() } },
        orderBy: { notBefore: 'asc' },
        take: 20,
      });
      for (const candidate of candidates)
        await this.prisma.$transaction(
          async (tx) => {
            const commitId = /^maps\/\d+\/commits\/([^/]+)\//.exec(
              candidate.objectKey,
            )?.[1];
            if (commitId)
              await tx.$queryRaw`
          SELECT "id" FROM "map_scene_commits" WHERE "id" = ${commitId} FOR UPDATE`;
            const locked = await tx.$queryRaw<{ object_key: string }[]>`
          SELECT "object_key" FROM "map_scene_blob_cleanup"
          WHERE "object_key" = ${candidate.objectKey} AND "not_before" <= NOW()
          FOR UPDATE SKIP LOCKED`;
            if (!locked.length) return;
            const published = await tx.mapSceneTile.count({
              where: { objectKey: candidate.objectKey },
            });
            const overview = await tx.map.count({
              where: { overviewKey: candidate.objectKey },
            });
            if (published || overview) {
              await tx.mapSceneBlobCleanup.delete({
                where: { objectKey: candidate.objectKey },
              });
              return;
            }
            const active = commitId
              ? await tx.mapSceneCommit.count({
                  where: {
                    id: commitId,
                    status: 'uploading',
                    expiresAt: { gt: new Date() },
                  },
                })
              : 0;
            if (active) {
              await tx.mapSceneBlobCleanup.update({
                where: { objectKey: candidate.objectKey },
                data: { notBefore: new Date(Date.now() + 600_000) },
              });
              return;
            }
            await this.storage.delete(candidate.objectKey);
            await tx.mapSceneBlobCleanup.delete({
              where: { objectKey: candidate.objectKey },
            });
          },
          { timeout: 30_000 },
        );
    } finally {
      this.#running = false;
    }
  }
}
