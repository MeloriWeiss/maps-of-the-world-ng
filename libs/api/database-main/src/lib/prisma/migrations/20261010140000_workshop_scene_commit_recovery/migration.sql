ALTER TABLE "map_scene_commits"
  ADD COLUMN "source_tiles_ready" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "copy_cursor" TEXT;

CREATE TABLE "map_scene_blob_cleanup" (
  "object_key" TEXT NOT NULL,
  "not_before" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "map_scene_blob_cleanup_pkey" PRIMARY KEY ("object_key")
);
CREATE INDEX "map_scene_blob_cleanup_not_before_idx" ON "map_scene_blob_cleanup"("not_before");
