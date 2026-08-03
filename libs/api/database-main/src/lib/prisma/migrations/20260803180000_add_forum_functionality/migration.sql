CREATE TABLE "forum_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

INSERT INTO "forum_categories" ("slug", "title", "description", "sort_order") VALUES
    ('maps', 'Карты', 'Создание и обсуждение игровых карт', 10),
    ('tools', 'Инструменты', 'Инструменты редактора и советы по работе', 20),
    ('texture-packs', 'Текстур-паки', 'Наборы текстур и графические материалы', 30);

ALTER TABLE "forums"
    ADD COLUMN "category_id" INTEGER,
    ADD COLUMN "likes_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "comments_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "forums"
SET "category_id" = (SELECT "id" FROM "forum_categories" WHERE "slug" = 'maps');

UPDATE "forums" AS forum
SET "comments_count" = (
    SELECT COUNT(*)::INTEGER FROM "forum_comments" AS comment WHERE comment."forum_id" = forum."id"
);

ALTER TABLE "forums" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "forums" ADD CONSTRAINT "forums_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "forums_category_id_created_at_idx" ON "forums"("category_id", "created_at");

ALTER TABLE "forum_comments" ADD COLUMN "parent_id" INTEGER;
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "forum_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "forum_comments_forum_id_created_at_idx" ON "forum_comments"("forum_id", "created_at");
CREATE INDEX "forum_comments_parent_id_idx" ON "forum_comments"("parent_id");

ALTER TABLE "forum_comments" DROP CONSTRAINT IF EXISTS "forum_comments_forum_id_fkey";
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_forum_id_fkey"
    FOREIGN KEY ("forum_id") REFERENCES "forums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "forum_likes" (
    "account_id" INTEGER NOT NULL,
    "forum_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forum_likes_pkey" PRIMARY KEY ("account_id", "forum_id")
);

CREATE INDEX "forum_likes_account_id_created_at_idx" ON "forum_likes"("account_id", "created_at");
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_forum_id_fkey"
    FOREIGN KEY ("forum_id") REFERENCES "forums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
