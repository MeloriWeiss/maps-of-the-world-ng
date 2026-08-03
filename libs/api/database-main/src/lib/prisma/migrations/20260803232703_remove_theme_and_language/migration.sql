/*
  Warnings:

  - You are about to drop the column `language` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `accounts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "PersonalAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "forum_comments" DROP CONSTRAINT "ForumComment_forumId_fkey";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "language",
DROP COLUMN "theme",
ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "accounts" RENAME CONSTRAINT "PersonalAccount_pkey" TO "accounts_pkey";

-- AlterTable
ALTER TABLE "forum_comments" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "forum_comments" RENAME CONSTRAINT "ForumComment_pkey" TO "forum_comments_pkey";

-- AlterTable
ALTER TABLE "forums" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "forums" RENAME CONSTRAINT "Forum_pkey" TO "forums_pkey";

-- AlterTable
ALTER TABLE "map_comments" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "map_comments" RENAME CONSTRAINT "MapComment_pkey" TO "map_comments_pkey";

-- AlterTable
ALTER TABLE "maps" RENAME CONSTRAINT "Map_pkey" TO "maps_pkey";

-- AlterTable
ALTER TABLE "sessions" RENAME CONSTRAINT "UserSession_pkey" TO "sessions_pkey";

-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";

-- DropEnum
DROP TYPE "AppTheme";

-- RenameForeignKey
ALTER TABLE "map_comments" RENAME CONSTRAINT "MapComment_mapId_fkey" TO "map_comments_map_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "UserSession_userId_fkey" TO "sessions_user_id_fkey";

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PersonalAccount_userId_key" RENAME TO "accounts_user_id_key";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
