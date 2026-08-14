import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { disconnectSeedClient, prisma } from './seed/client';

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const createSuperAdmin = async () => {
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { email: true },
  });

  if (existingSuperAdmin)
    throw new Error(
      `Super administrator already exists: ${existingSuperAdmin.email}`,
    );

  const email = getRequiredEnv('SUPER_ADMIN_EMAIL').toLowerCase();
  const username = getRequiredEnv('SUPER_ADMIN_USERNAME');
  const password = getRequiredEnv('SUPER_ADMIN_PASSWORD');

  if (password.length < 12)
    throw new Error('SUPER_ADMIN_PASSWORD must contain at least 12 characters');

  const duplicates = await prisma.user.findMany({
    where: { OR: [{ email }, { username }] },
    select: { id: true, email: true, username: true },
  });
  const existingUser = duplicates.find(
    (user) => user.email === email && user.username === username,
  );
  if (duplicates.length > (existingUser ? 1 : 0))
    throw new Error('Email or username belongs to another user');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      username,
      passwordHash,
      role: 'SUPER_ADMIN',
      personalAccount: { create: { nickname: username } },
    },
    update: { passwordHash, role: 'SUPER_ADMIN', status: 'ACTIVE' },
    select: { id: true, email: true, username: true },
  });

  console.log(`Super administrator created: ${user.email} (id: ${user.id})`);
};

createSuperAdmin()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create super administrator: ${message}`);
    process.exitCode = 1;
  })
  .finally(disconnectSeedClient);
