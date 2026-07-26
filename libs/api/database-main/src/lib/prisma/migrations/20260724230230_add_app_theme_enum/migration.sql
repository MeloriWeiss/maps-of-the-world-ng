-- CreateEnum
CREATE TYPE "AppTheme" AS ENUM ('default', 'light', 'dark');

-- AlterTable
ALTER TABLE "accounts"
  ALTER COLUMN "theme" DROP DEFAULT,
  ALTER COLUMN "theme" TYPE "AppTheme"
    USING COALESCE("theme", 'default')::"AppTheme",
  ALTER COLUMN "theme" SET NOT NULL,
  ALTER COLUMN "theme" SET DEFAULT 'default';
