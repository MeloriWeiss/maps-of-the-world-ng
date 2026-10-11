CREATE TYPE "TextureKind" AS ENUM ('SURFACE', 'STAMP');
ALTER TABLE "textures" ADD COLUMN "kind" "TextureKind" NOT NULL DEFAULT 'SURFACE';
ALTER TABLE "maps" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "maps" ADD COLUMN "overview_key" TEXT;
CREATE TABLE "map_chunks" (
  "map_id" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  CONSTRAINT "map_chunks_pkey" PRIMARY KEY ("map_id", "key"),
  CONSTRAINT "map_chunks_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
