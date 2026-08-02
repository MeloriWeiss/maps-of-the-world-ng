CREATE TABLE "map_likes" (
    "account_id" INTEGER NOT NULL,
    "map_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_likes_pkey" PRIMARY KEY ("account_id", "map_id")
);

CREATE TABLE "texture_pack_likes" (
    "account_id" INTEGER NOT NULL,
    "texture_pack_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "texture_pack_likes_pkey" PRIMARY KEY ("account_id", "texture_pack_id")
);

CREATE INDEX "map_likes_account_id_created_at_idx"
ON "map_likes"("account_id", "created_at");

CREATE INDEX "texture_pack_likes_account_id_created_at_idx"
ON "texture_pack_likes"("account_id", "created_at");

ALTER TABLE "map_likes"
ADD CONSTRAINT "map_likes_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "map_likes"
ADD CONSTRAINT "map_likes_map_id_fkey"
FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "texture_pack_likes"
ADD CONSTRAINT "texture_pack_likes_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "texture_pack_likes"
ADD CONSTRAINT "texture_pack_likes_texture_pack_id_fkey"
FOREIGN KEY ("texture_pack_id") REFERENCES "texture_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
