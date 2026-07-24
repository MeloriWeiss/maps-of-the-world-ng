/*
  Warnings:

  - You are about to drop the `Forum` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ForumComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Map` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MapComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PersonalAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Forum" DROP CONSTRAINT "Forum_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ForumComment" DROP CONSTRAINT "ForumComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ForumComment" DROP CONSTRAINT "ForumComment_forumId_fkey";

-- DropForeignKey
ALTER TABLE "Map" DROP CONSTRAINT "Map_userId_fkey";

-- DropForeignKey
ALTER TABLE "MapComment" DROP CONSTRAINT "MapComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "MapComment" DROP CONSTRAINT "MapComment_mapId_fkey";

-- DropForeignKey
ALTER TABLE "PersonalAccount" DROP CONSTRAINT "PersonalAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_userId_fkey";

-- DropTable
DROP TABLE "Forum";

-- DropTable
DROP TABLE "ForumComment";

-- DropTable
DROP TABLE "Map";

-- DropTable
DROP TABLE "MapComment";

-- DropTable
DROP TABLE "PersonalAccount";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserSession";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maps" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "account_id" INTEGER NOT NULL,

    CONSTRAINT "maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_comments" (
    "id" SERIAL NOT NULL,
    "comment" TEXT NOT NULL,
    "map_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forums" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "post" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_comments" (
    "id" SERIAL NOT NULL,
    "comment" TEXT NOT NULL,
    "forum_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "middle_name" TEXT,
    "phone_number" TEXT,
    "birth_date" TIMESTAMP(3),
    "bio" TEXT,
    "avatar_url" TEXT,
    "language" TEXT,
    "theme" TEXT DEFAULT 'default',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_id_key" ON "accounts"("user_id");

-- AddForeignKey
ALTER TABLE "maps" ADD CONSTRAINT "maps_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_comments" ADD CONSTRAINT "map_comments_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_comments" ADD CONSTRAINT "map_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forums" ADD CONSTRAINT "forums_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_forum_id_fkey" FOREIGN KEY ("forum_id") REFERENCES "forums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
