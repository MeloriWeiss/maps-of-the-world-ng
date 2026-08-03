import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const connectionString = process.env['MAIN_DATABASE_URL'];
if (!connectionString) throw new Error('MAIN_DATABASE_URL is required');

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export type SeedPrismaClient = PrismaClient;

export const disconnectSeedClient = () => prisma.$disconnect();
