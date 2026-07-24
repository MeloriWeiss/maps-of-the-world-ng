/*
  Warnings:

  - The `theme` column on the `accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AppTheme" AS ENUM ('default', 'light', 'dark');

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "theme",
ADD COLUMN     "theme" "AppTheme" NOT NULL DEFAULT 'default';
