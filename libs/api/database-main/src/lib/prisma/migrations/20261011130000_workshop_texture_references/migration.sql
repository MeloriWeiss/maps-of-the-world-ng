ALTER TABLE "textures" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "texture_packs" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "textures_deleted_at_idx" ON "textures"("deleted_at");
CREATE INDEX "texture_packs_deleted_at_idx" ON "texture_packs"("deleted_at");

CREATE TABLE "map_scene_texture_refs" (
  "map_id" INTEGER NOT NULL,
  "cell_x" INTEGER NOT NULL,
  "cell_y" INTEGER NOT NULL,
  "page_id" INTEGER NOT NULL,
  "texture_id" TEXT NOT NULL,
  CONSTRAINT "map_scene_texture_refs_pkey" PRIMARY KEY ("map_id", "cell_x", "cell_y", "page_id", "texture_id"),
  CONSTRAINT "map_scene_texture_refs_page_fkey" FOREIGN KEY ("map_id", "cell_x", "cell_y", "page_id")
    REFERENCES "map_scene_pages"("map_id", "cell_x", "cell_y", "page_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "map_scene_texture_refs_texture_fkey" FOREIGN KEY ("texture_id")
    REFERENCES "textures"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "map_scene_texture_refs_texture_id_idx" ON "map_scene_texture_refs"("texture_id");

CREATE TABLE "texture_blob_cleanup" (
  "object_key" TEXT NOT NULL PRIMARY KEY,
  "not_before" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "texture_blob_cleanup_not_before_idx" ON "texture_blob_cleanup"("not_before");
