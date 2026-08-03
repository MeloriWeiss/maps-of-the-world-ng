import { SeedPrismaClient } from './client';

export const resetDatabase = (prisma: SeedPrismaClient) =>
  prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "sessions",
      "forum_likes",
      "forum_comments",
      "forums",
      "forum_categories",
      "texture_pack_likes",
      "textures",
      "texture_packs",
      "map_likes",
      "map_comments",
      "maps",
      "accounts",
      "users"
    RESTART IDENTITY CASCADE;
  `);
