CREATE TABLE "textures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" INTEGER NOT NULL,

    CONSTRAINT "textures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "textures_object_key_key" ON "textures"("object_key");
CREATE INDEX "textures_account_id_created_at_idx" ON "textures"("account_id", "created_at");

ALTER TABLE "textures"
ADD CONSTRAINT "textures_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
