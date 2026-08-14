import { disconnectSeedClient, prisma } from './seed/client';
import { resetDatabase } from './seed/reset';
import { seedUsers } from './seed/users';
import { seedMaps } from './seed/maps';
import { seedTexturePacks } from './seed/texture-packs';
import { seedForum } from './seed/forum';
import { seedSessions } from './seed/sessions';
import { printSeedSummary } from './seed/summary';
import { assertDevelopmentSeedAllowed } from './seed/seed-environment';

async function main() {
  assertDevelopmentSeedAllowed();
  console.log('Resetting development database...');
  await resetDatabase(prisma);

  const accounts = await seedUsers(prisma);
  await seedMaps(prisma, accounts);
  await seedTexturePacks(prisma, accounts);
  await seedForum(prisma, accounts);
  await seedSessions(prisma, accounts);
  await printSeedSummary(prisma);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(disconnectSeedClient);
