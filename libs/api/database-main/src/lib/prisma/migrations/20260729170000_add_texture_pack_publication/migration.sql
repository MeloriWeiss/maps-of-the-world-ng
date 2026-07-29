ALTER TABLE "texture_packs"
ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "published_at" TIMESTAMP(3);

CREATE INDEX "texture_packs_is_published_published_at_idx"
ON "texture_packs"("is_published", "published_at");
