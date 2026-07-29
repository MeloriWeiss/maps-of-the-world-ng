CREATE TABLE "texture_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "account_id" INTEGER NOT NULL,

    CONSTRAINT "texture_packs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "textures" ADD COLUMN "pack_id" TEXT;

INSERT INTO "texture_packs" (
    "id",
    "name",
    "description",
    "created_at",
    "updated_at",
    "account_id"
)
SELECT
    md5('legacy-textures-' || "account_id"::TEXT)::UUID::TEXT,
    'Мои текстуры',
    'Автоматически созданный пак для ранее загруженных текстур',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    "account_id"
FROM "textures"
GROUP BY "account_id";

UPDATE "textures"
SET "pack_id" = md5('legacy-textures-' || "account_id"::TEXT)::UUID::TEXT;

ALTER TABLE "textures" ALTER COLUMN "pack_id" SET NOT NULL;

CREATE INDEX "texture_packs_account_id_updated_at_idx"
ON "texture_packs"("account_id", "updated_at");

CREATE INDEX "textures_pack_id_created_at_idx"
ON "textures"("pack_id", "created_at");

ALTER TABLE "texture_packs"
ADD CONSTRAINT "texture_packs_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "textures"
ADD CONSTRAINT "textures_pack_id_fkey"
FOREIGN KEY ("pack_id") REFERENCES "texture_packs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
