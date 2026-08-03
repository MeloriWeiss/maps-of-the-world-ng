import { SeedPrismaClient } from './client';
import { daysAgo, daysFromNow } from './dates';
import { SeedAccount } from './types';

export async function seedSessions(
  prisma: SeedPrismaClient,
  accounts: SeedAccount[],
) {
  for (const [index, account] of accounts.entries()) {
    await prisma.userSession.create({
      data: {
        tokenHash: `seed-active-session-${account.username}`,
        userAgent: index % 2 === 0 ? 'Chrome / Windows' : 'Firefox / Linux',
        ip: `127.0.0.${index + 1}`,
        createdAt: daysAgo(index + 2),
        lastUsedAt: daysAgo(index % 3),
        expiresAt: daysFromNow(30 - index),
        userId: account.userId,
      },
    });
  }
  await prisma.userSession.create({
    data: {
      tokenHash: 'seed-expired-admin-session',
      userAgent: null,
      ip: null,
      createdAt: daysAgo(60),
      lastUsedAt: daysAgo(45),
      expiresAt: daysAgo(30),
      userId: accounts[0].userId,
    },
  });

  console.log('Sessions: 9 (8 active, 1 expired)');
}
