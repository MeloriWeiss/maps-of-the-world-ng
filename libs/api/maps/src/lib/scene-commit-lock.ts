import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@wm/api/database-main';

/** Блокирует коммит сцены для последовательного изменения в транзакции. */
export async function lockSceneCommit(
  tx: Prisma.TransactionClient,
  mapId: number,
  accountId: number,
  commitId: string,
  uploadingOnly = false,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "map_scene_commits"
    WHERE "id" = ${commitId} AND "map_id" = ${mapId} AND "account_id" = ${accountId}
    FOR UPDATE`;
  if (!rows.length) throw new NotFoundException('Map save not found');
  const commit = await tx.mapSceneCommit.findUniqueOrThrow({
    where: { id: commitId },
  });
  if (
    uploadingOnly &&
    (commit.status !== 'uploading' || commit.expiresAt < new Date())
  )
    throw new ConflictException('Map save is closed');
  return commit;
}
