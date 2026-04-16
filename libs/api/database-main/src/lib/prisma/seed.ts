import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['MAIN_DATABASE_URL'],
});

export const prisma = new PrismaClient({ adapter });

const ADMIN_PASSWORD_HASH =
  '$2b$10$5h7mR8U9xYzZ8QW1uE3O0OllZ6sP9m3Q8F9d7H6kL5jG4fH3d2Cq'; // admin123, 10 циклов

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "UserSession",
      "ForumComment",
      "Forum",
      "MapComment",
      "Map",
      "PersonalAccount",
      "User"
    RESTART IDENTITY CASCADE;
  `);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      username: 'admin',
    },
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: ADMIN_PASSWORD_HASH,
      personalAccount: {
        create: {
          nickname: 'Admin',
        },
      },
    },
    include: {
      personalAccount: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      username: 'user',
    },
    create: {
      email: 'user@example.com',
      username: 'user',
      passwordHash: ADMIN_PASSWORD_HASH,
      personalAccount: {
        create: {
          nickname: 'RegularUser',
        },
      },
    },
    include: {
      personalAccount: true,
    },
  });

  const adminMap = await prisma.map.upsert({
    where: { id: 1 },
    update: {
      description: 'Demo world map by admin',
      isPublished: true,
    },
    create: {
      name: 'World map example',
      body: '{"type":"FeatureCollection","features":[]}',
      description: 'Demo world map by admin',
      isPublished: true,
      likesCount: 2,
      commentsCount: 2,
      userId: admin.id,
    },
  });

  await prisma.mapComment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      comment: 'Первая тестовая карта, выглядит круто!',
      mapId: adminMap.id,
      authorId: admin.id,
    },
  });

  await prisma.mapComment.upsert({
    where: { id: 2 },
    update: {},
    create: {
      comment: 'А можно добавить больше деталей по Европе?',
      mapId: adminMap.id,
      authorId: user.id,
    },
  });

  const forum = await prisma.forum.upsert({
    where: { id: 1 },
    update: {
      title: 'Обсуждение карт мира',
    },
    create: {
      title: 'Обсуждение карт мира',
      post: 'Делимся идеями по улучшению интерактивной карты мира.',
      authorId: admin.id,
    },
  });

  await prisma.forumComment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      comment: 'Я бы добавил слои с историческими границами.',
      forumId: forum.id,
      authorId: user.id,
    },
  });

  await prisma.forumComment.upsert({
    where: { id: 2 },
    update: {},
    create: {
      comment: 'Поддерживаю, плюс фильтры по годам.',
      forumId: forum.id,
      authorId: admin.id,
    },
  });

  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.userSession.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tokenHash: 'seed-admin-session-token-hash',
      userAgent: 'seed-script',
      ip: '127.0.0.1',
      createdAt: now,
      lastUsedAt: now,
      expiresAt: expires,
      userId: admin.id,
    },
  });

  await prisma.userSession.upsert({
    where: { id: 2 },
    update: {},
    create: {
      tokenHash: 'seed-user-session-token-hash',
      userAgent: 'seed-script',
      ip: '127.0.0.1',
      createdAt: now,
      lastUsedAt: now,
      expiresAt: expires,
      userId: user.id,
    },
  });

  console.log('Seed completed:', {
    admin: { id: admin.id, email: admin.email },
    user: { id: user.id, email: user.email },
    adminMapId: adminMap.id,
    forumId: forum.id,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
