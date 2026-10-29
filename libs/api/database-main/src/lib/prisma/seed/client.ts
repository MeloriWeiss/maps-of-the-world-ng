import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const connectionString = process.env['MAIN_DATABASE_URL'];
if (!connectionString) throw new Error('MAIN_DATABASE_URL is required');

const adapter = new PrismaPg({ connectionString });

/** Общий клиент Prisma для запуска сценариев заполнения базы. */
export const prisma = new PrismaClient({ adapter });

/** Тип клиента Prisma, используемого скриптами начального заполнения. */
export type SeedPrismaClient = PrismaClient;

/** Закрывает соединение клиента Prisma после завершения seed-сценария. */
export const disconnectSeedClient = () => prisma.$disconnect();
