import { Prisma } from '@wm/api/database-main';
import { WorldBounds } from '@wm/shared/workshop';

interface CoverageRow {
  minX: number | null;
  minY: number | null;
  maxX: number | null;
  maxY: number | null;
}

/** Bounds of all indexed objects in a container subtree, including unloaded pages. */
export async function sceneContainerCoverage(
  tx: Prisma.TransactionClient,
  mapId: number,
  containerId: string,
): Promise<WorldBounds | null> {
  const [row] = await tx.$queryRaw<CoverageRow[]>`
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM "map_scene_containers" WHERE "map_id" = ${mapId} AND id = ${containerId}
      UNION
      SELECT child.id FROM "map_scene_containers" child
      JOIN descendants parent ON child."parent_id" = parent.id
      WHERE child."map_id" = ${mapId}
    )
    SELECT MIN(scene_object."min_x") AS "minX", MIN(scene_object."min_y") AS "minY",
      MAX(scene_object."max_x") AS "maxX", MAX(scene_object."max_y") AS "maxY"
    FROM "map_scene_objects" scene_object
    JOIN descendants ON scene_object."parent_id" = descendants.id
    WHERE scene_object."map_id" = ${mapId}
  `;
  if (
    row?.minX === null ||
    row?.minY === null ||
    row?.maxX === null ||
    row?.maxY === null ||
    !row
  )
    return null;
  return {
    x: row.minX,
    y: row.minY,
    width: row.maxX - row.minX,
    height: row.maxY - row.minY,
  };
}
