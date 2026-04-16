import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx libs/api/database-main/src/lib/prisma/seed.ts',
  },
  datasource: {
    url: process.env['MAIN_DATABASE_URL'],
  },
});
