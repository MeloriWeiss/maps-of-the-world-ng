CREATE TABLE "map_scene_pages" (
  "map_id" INTEGER NOT NULL, "cell_x" INTEGER NOT NULL, "cell_y" INTEGER NOT NULL,
  "page_id" INTEGER NOT NULL, "min_x" DOUBLE PRECISION NOT NULL, "min_y" DOUBLE PRECISION NOT NULL,
  "max_x" DOUBLE PRECISION NOT NULL, "max_y" DOUBLE PRECISION NOT NULL, "body" TEXT NOT NULL,
  CONSTRAINT "map_scene_pages_pkey" PRIMARY KEY ("map_id", "cell_x", "cell_y", "page_id"),
  CONSTRAINT "map_scene_pages_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "map_scene_pages_map_id_cell_x_cell_y_idx" ON "map_scene_pages"("map_id", "cell_x", "cell_y");
CREATE INDEX "map_scene_pages_map_id_min_x_max_x_idx" ON "map_scene_pages"("map_id", "min_x", "max_x");
CREATE INDEX "map_scene_pages_map_id_min_y_max_y_idx" ON "map_scene_pages"("map_id", "min_y", "max_y");

CREATE TABLE "map_scene_objects" (
  "map_id" INTEGER NOT NULL, "object_id" TEXT NOT NULL, "node_id" TEXT NOT NULL,
  "parent_id" TEXT NOT NULL, "kind" TEXT NOT NULL, "name" TEXT NOT NULL,
  "min_x" DOUBLE PRECISION NOT NULL, "min_y" DOUBLE PRECISION NOT NULL,
  "max_x" DOUBLE PRECISION NOT NULL, "max_y" DOUBLE PRECISION NOT NULL,
  "part_count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "map_scene_objects_pkey" PRIMARY KEY ("map_id", "object_id"),
  CONSTRAINT "map_scene_objects_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "map_scene_objects_map_id_min_x_max_x_idx" ON "map_scene_objects"("map_id", "min_x", "max_x");
CREATE INDEX "map_scene_objects_map_id_min_y_max_y_idx" ON "map_scene_objects"("map_id", "min_y", "max_y");
CREATE INDEX "map_scene_objects_map_id_kind_name_idx" ON "map_scene_objects"("map_id", "kind", "name");

CREATE TABLE "map_scene_object_parts" (
  "map_id" INTEGER NOT NULL, "object_id" TEXT NOT NULL, "part_id" TEXT NOT NULL,
  "cell_x" INTEGER NOT NULL, "cell_y" INTEGER NOT NULL, "page_id" INTEGER NOT NULL,
  "min_x" DOUBLE PRECISION NOT NULL, "min_y" DOUBLE PRECISION NOT NULL,
  "max_x" DOUBLE PRECISION NOT NULL, "max_y" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "map_scene_object_parts_pkey" PRIMARY KEY ("map_id", "part_id"),
  CONSTRAINT "map_scene_object_parts_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "map_scene_object_parts_map_id_object_id_idx" ON "map_scene_object_parts"("map_id", "object_id");
CREATE INDEX "map_scene_object_parts_map_id_cell_x_cell_y_page_id_idx" ON "map_scene_object_parts"("map_id", "cell_x", "cell_y", "page_id");

CREATE TABLE "map_scene_containers" (
  "map_id" INTEGER NOT NULL, "id" TEXT NOT NULL, "parent_id" TEXT,
  "kind" TEXT NOT NULL, "name" TEXT NOT NULL, "visible" BOOLEAN NOT NULL DEFAULT true,
  "locked" BOOLEAN NOT NULL DEFAULT false, "order_key" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "map_scene_containers_pkey" PRIMARY KEY ("map_id", "id"),
  CONSTRAINT "map_scene_containers_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "map_scene_containers_map_id_parent_id_order_key_idx" ON "map_scene_containers"("map_id", "parent_id", "order_key");

CREATE TABLE "map_scene_tiles" (
  "map_id" INTEGER NOT NULL, "level" INTEGER NOT NULL, "x" INTEGER NOT NULL, "y" INTEGER NOT NULL,
  "object_key" TEXT, "version" INTEGER NOT NULL,
  CONSTRAINT "map_scene_tiles_pkey" PRIMARY KEY ("map_id", "level", "x", "y"),
  CONSTRAINT "map_scene_tiles_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "map_scene_tiles_map_id_level_idx" ON "map_scene_tiles"("map_id", "level");

CREATE TABLE "map_scene_commits" (
  "id" TEXT NOT NULL, "map_id" INTEGER NOT NULL, "account_id" INTEGER NOT NULL,
  "expected_revision" INTEGER NOT NULL, "source_map_id" INTEGER, "source_revision" INTEGER,
  "idempotency_key" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'uploading',
  "header" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "map_scene_commits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "map_scene_commits_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "map_scene_commits_map_id_idempotency_key_key" ON "map_scene_commits"("map_id", "idempotency_key");
CREATE INDEX "map_scene_commits_account_id_expires_at_idx" ON "map_scene_commits"("account_id", "expires_at");

CREATE TABLE "map_scene_commit_pages" (
  "commit_id" TEXT NOT NULL, "cell_x" INTEGER NOT NULL, "cell_y" INTEGER NOT NULL,
  "page_id" INTEGER NOT NULL, "min_x" DOUBLE PRECISION NOT NULL, "min_y" DOUBLE PRECISION NOT NULL,
  "max_x" DOUBLE PRECISION NOT NULL, "max_y" DOUBLE PRECISION NOT NULL,
  "body" TEXT NOT NULL, "deleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "map_scene_commit_pages_pkey" PRIMARY KEY ("commit_id", "cell_x", "cell_y", "page_id"),
  CONSTRAINT "map_scene_commit_pages_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "map_scene_commits"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "map_scene_commit_tiles" (
  "commit_id" TEXT NOT NULL, "level" INTEGER NOT NULL, "x" INTEGER NOT NULL, "y" INTEGER NOT NULL,
  "object_key" TEXT,
  CONSTRAINT "map_scene_commit_tiles_pkey" PRIMARY KEY ("commit_id", "level", "x", "y"),
  CONSTRAINT "map_scene_commit_tiles_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "map_scene_commits"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
