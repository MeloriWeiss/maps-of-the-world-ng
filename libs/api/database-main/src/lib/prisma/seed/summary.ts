import { SeedPrismaClient } from './client';
import { SEED_PASSWORD } from './users';

export async function printSeedSummary(prisma: SeedPrismaClient) {
  const [
    users,
    accounts,
    sessions,
    maps,
    mapComments,
    mapLikes,
    texturePacks,
    textures,
    texturePackLikes,
    forumCategories,
    forums,
    forumComments,
    forumLikes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.personalAccount.count(),
    prisma.userSession.count(),
    prisma.map.count(),
    prisma.mapComment.count(),
    prisma.mapLike.count(),
    prisma.texturePack.count(),
    prisma.texture.count(),
    prisma.texturePackLike.count(),
    prisma.forumCategory.count(),
    prisma.forum.count(),
    prisma.forumComment.count(),
    prisma.forumLike.count(),
  ]);

  console.table({
    users,
    accounts,
    sessions,
    maps,
    mapComments,
    mapLikes,
    texturePacks,
    textures,
    texturePackLikes,
    forumCategories,
    forums,
    forumComments,
    forumLikes,
  });
  console.log('\nDemo credentials:');
  console.log(`  admin@example.com / ${SEED_PASSWORD}`);
  console.log(`  user@example.com / ${SEED_PASSWORD}`);
  console.log('\nPagination scenarios:');
  console.log('  /forum — 55 discussions, 20 per page');
  console.log(
    '  /texture-packs/10000000-0000-4000-8000-000000000001 — 62 textures',
  );
}
