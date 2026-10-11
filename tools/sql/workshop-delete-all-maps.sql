-- One-time manual reset before enabling the v4 workshop scene format.
-- Run against the intended database only after making a backup.
-- This script removes every map, including published maps and drafts.
-- Texture packs and their original images are retained.
BEGIN;
DELETE FROM "map_comments";
DELETE FROM "maps";
COMMIT;

-- Map previews live in object storage. Database deletion cannot remove those blobs.
-- Remove objects under the maps/ prefix through the configured object-storage tool.
