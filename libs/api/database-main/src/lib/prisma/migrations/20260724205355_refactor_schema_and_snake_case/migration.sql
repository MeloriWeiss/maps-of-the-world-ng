-- Preserve the legacy schema and its data while moving to snake_case.
-- Relations that used to point at users are converted to account ids first.
UPDATE "Map" AS map
SET "userId" = account.id
FROM "PersonalAccount" AS account
WHERE account."userId" = map."userId";

UPDATE "MapComment" AS comment
SET "authorId" = account.id
FROM "PersonalAccount" AS account
WHERE account."userId" = comment."authorId";

UPDATE "Forum" AS forum
SET "authorId" = account.id
FROM "PersonalAccount" AS account
WHERE account."userId" = forum."authorId";

UPDATE "ForumComment" AS comment
SET "authorId" = account.id
FROM "PersonalAccount" AS account
WHERE account."userId" = comment."authorId";

ALTER TABLE "Map" DROP CONSTRAINT "Map_userId_fkey";
ALTER TABLE "MapComment" DROP CONSTRAINT "MapComment_authorId_fkey";
ALTER TABLE "Forum" DROP CONSTRAINT "Forum_authorId_fkey";
ALTER TABLE "ForumComment" DROP CONSTRAINT "ForumComment_authorId_fkey";

ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "PersonalAccount" RENAME TO "accounts";
ALTER TABLE "UserSession" RENAME TO "sessions";
ALTER TABLE "Map" RENAME TO "maps";
ALTER TABLE "MapComment" RENAME TO "map_comments";
ALTER TABLE "Forum" RENAME TO "forums";
ALTER TABLE "ForumComment" RENAME TO "forum_comments";

ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";

ALTER TABLE "accounts" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "accounts" ADD COLUMN "first_name" TEXT;
ALTER TABLE "accounts" ADD COLUMN "last_name" TEXT;
ALTER TABLE "accounts" ADD COLUMN "middle_name" TEXT;
ALTER TABLE "accounts" ADD COLUMN "phone_number" TEXT;
ALTER TABLE "accounts" ADD COLUMN "birth_date" TEXT;
ALTER TABLE "accounts" ADD COLUMN "bio" TEXT;
ALTER TABLE "accounts" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "accounts" ADD COLUMN "language" TEXT;
ALTER TABLE "accounts" ADD COLUMN "theme" TEXT DEFAULT 'default';
ALTER TABLE "accounts" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "accounts" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "accounts"
SET "nickname" = COALESCE(
  "nickname",
  (SELECT split_part("email", '@', 1) FROM "users" WHERE "users"."id" = "accounts"."user_id"),
  'user-' || "id"
);
ALTER TABLE "accounts" ALTER COLUMN "nickname" SET NOT NULL;

ALTER TABLE "sessions" RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "sessions" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "sessions" RENAME COLUMN "lastUsedAt" TO "last_used_at";
ALTER TABLE "sessions" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id";

ALTER TABLE "maps" RENAME COLUMN "isPublished" TO "is_published";
ALTER TABLE "maps" RENAME COLUMN "likesCount" TO "likes_count";
ALTER TABLE "maps" RENAME COLUMN "commentsCount" TO "comments_count";
ALTER TABLE "maps" RENAME COLUMN "userId" TO "account_id";
UPDATE "maps" SET "likes_count" = 0 WHERE "likes_count" IS NULL;
UPDATE "maps" SET "comments_count" = 0 WHERE "comments_count" IS NULL;
ALTER TABLE "maps" ALTER COLUMN "is_published" SET DEFAULT false;
ALTER TABLE "maps" ALTER COLUMN "likes_count" SET DEFAULT 0;
ALTER TABLE "maps" ALTER COLUMN "likes_count" SET NOT NULL;
ALTER TABLE "maps" ALTER COLUMN "comments_count" SET DEFAULT 0;
ALTER TABLE "maps" ALTER COLUMN "comments_count" SET NOT NULL;

ALTER TABLE "map_comments" RENAME COLUMN "mapId" TO "map_id";
ALTER TABLE "map_comments" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "map_comments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "map_comments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "forums" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "forums" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "forums" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "forum_comments" RENAME COLUMN "forumId" TO "forum_id";
ALTER TABLE "forum_comments" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "forum_comments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "forum_comments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

ALTER TABLE "maps"
  ADD CONSTRAINT "maps_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "map_comments"
  ADD CONSTRAINT "map_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "forums"
  ADD CONSTRAINT "forums_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "forum_comments"
  ADD CONSTRAINT "forum_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
