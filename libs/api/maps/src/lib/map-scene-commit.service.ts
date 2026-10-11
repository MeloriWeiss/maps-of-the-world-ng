import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import {
  isMapChunkBody,
  isMapSceneHeaderV4,
  MapChunkShapeRecord,
  mapCellOf,
  mapChunkSize,
  mapPreviewMaxLevel,
  mapWorldHalfSize,
  WorldBounds,
} from '@wm/shared/workshop';
import { PublishSceneCommitDto } from './map-scene-v4.dto';
import { lockSceneCommit } from './scene-commit-lock';
import { queueSceneBlobCleanup } from './scene-blob-cleanup.service';
import { sceneContainerCoverage } from './map-scene-container-coverage';

interface PageKey {
  cellX: number;
  cellY: number;
  pageId: number;
}
interface PageRow extends PageKey {
  mapId: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  body: string;
}
interface ObjectPartRow extends PageKey {
  mapId: number;
  objectId: string;
  partId: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
interface TextureRefRow extends PageKey {
  mapId: number;
  textureId: string;
}
const pageBoundsTolerance = 1e-6;

function objectId(record: MapChunkShapeRecord) {
  const logical = record.shape['objectId'];
  return typeof logical === 'string' && logical.length
    ? logical
    : (record.shape['id'] as string);
}

function referencedTextureId(record: MapChunkShapeRecord): string | null {
  const shape = record.shape;
  if (shape['type'] !== 'stamp' && shape['type'] !== 'texture') return null;
  const id = shape['textureId'];
  const url = shape['textureUrl'];
  if (shape['type'] === 'texture' && id === null && url === null) return null;
  if (
    typeof id !== 'string' ||
    !id ||
    id.length > 100 ||
    url !== `/api/textures/${encodeURIComponent(id)}/file`
  )
    throw new BadRequestException('Invalid texture reference');
  return id;
}

function shapeBounds(record: MapChunkShapeRecord): WorldBounds {
  const shape = record.shape;
  const finite = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const type = shape['type'];
  if (type === 'rectangle')
    return {
      x: finite(shape['x']),
      y: finite(shape['y']),
      width: Math.abs(finite(shape['width'])),
      height: Math.abs(finite(shape['height'])),
    };
  if (type === 'text' && record.bounds) return record.bounds;
  if (type === 'text')
    return {
      x: finite(shape['x']),
      y: finite(shape['y']) - finite(shape['fontSize']),
      width: Math.max(
        1,
        String(shape['text']).length * finite(shape['fontSize']),
      ),
      height: Math.max(1, finite(shape['fontSize'])),
    };
  if (type === 'stamp') {
    const stamps = shape['instances'] as {
      x: number;
      y: number;
      width: number;
      height: number;
    }[];
    if (!stamps.length) throw new BadRequestException('Empty stamp part');
    const size = (stamp: (typeof stamps)[number]) => {
      const angle =
        (finite((stamp as { rotation?: number }).rotation) * Math.PI) / 180;
      return {
        width:
          Math.abs(stamp.width * Math.cos(angle)) +
          Math.abs(stamp.height * Math.sin(angle)),
        height:
          Math.abs(stamp.width * Math.sin(angle)) +
          Math.abs(stamp.height * Math.cos(angle)),
      };
    };
    const left = Math.min(
      ...stamps.map((stamp) => stamp.x - size(stamp).width / 2),
    );
    const right = Math.max(
      ...stamps.map((stamp) => stamp.x + size(stamp).width / 2),
    );
    const top = Math.min(
      ...stamps.map((stamp) => stamp.y - size(stamp).height / 2),
    );
    const bottom = Math.max(
      ...stamps.map((stamp) => stamp.y + size(stamp).height / 2),
    );
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  const points = shape['points'] as { x: number; y: number }[];
  const margin = finite(shape['strokeWidth']) / 2;
  const left = Math.min(...points.map((point) => point.x)) - margin;
  const right = Math.max(...points.map((point) => point.x)) + margin;
  const top = Math.min(...points.map((point) => point.y)) - margin;
  const bottom = Math.max(...points.map((point) => point.y)) + margin;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function affectedPreviewTiles(bounds: WorldBounds, result: Set<string>) {
  const minX = Math.floor(bounds.x / mapChunkSize);
  const minY = Math.floor(bounds.y / mapChunkSize);
  const maxX = Math.ceil((bounds.x + bounds.width) / mapChunkSize) - 1;
  const maxY = Math.ceil((bounds.y + bounds.height) / mapChunkSize) - 1;
  if ((maxX - minX + 1) * (maxY - minY + 1) > 4096)
    throw new BadRequestException('Change affects too many preview tiles');
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      let currentX = x,
        currentY = y;
      for (let level = 0; level <= mapPreviewMaxLevel; level++) {
        result.add(`${level}:${currentX}:${currentY}`);
        currentX = Math.floor(currentX / 2);
        currentY = Math.floor(currentY / 2);
      }
    }
}

@Injectable()
export class MapSceneCommitService {
  constructor(private readonly prisma: PrismaMainService) {}

  async publish(
    mapId: number,
    accountId: number,
    commitId: string,
    dto: PublishSceneCommitDto,
  ) {
    let rawHeader: unknown;
    try {
      rawHeader = JSON.parse(dto.header);
    } catch {
      throw new BadRequestException('Invalid scene header');
    }
    if (
      !isMapSceneHeaderV4(rawHeader) ||
      dto.containers.length > 1000 ||
      rawHeader.bounds.x < -mapWorldHalfSize ||
      rawHeader.bounds.y < -mapWorldHalfSize ||
      rawHeader.bounds.x + rawHeader.bounds.width > mapWorldHalfSize ||
      rawHeader.bounds.y + rawHeader.bounds.height > mapWorldHalfSize
    )
      throw new BadRequestException('Invalid scene header');
    if (
      new Set(dto.containers.map((item) => item.id)).size !==
      dto.containers.length
    )
      throw new BadRequestException('Duplicate scene containers');
    const header = rawHeader;
    return this.prisma.$transaction(
      async (tx) => {
        await lockSceneCommit(tx, mapId, accountId, commitId);
        const commit = await tx.mapSceneCommit.findFirst({
          where: { id: commitId, mapId, accountId },
          include: { pages: true, tiles: true },
        });
        if (!commit) throw new NotFoundException('Map save not found');
        if (commit.status === 'committed')
          return { revision: commit.expectedRevision + 1 };
        if (commit.status !== 'uploading' || commit.expiresAt < new Date())
          throw new ConflictException('Map save is closed');
        const initialMap =
          commit.expectedRevision === 0 && commit.sourceMapId === null;
        const pageBodies = new Map<string, MapChunkShapeRecord[]>();
        for (const page of commit.pages) {
          if (page.deleted) continue;
          let value: unknown;
          try {
            value = JSON.parse(page.body);
          } catch {
            throw new BadRequestException('Invalid page body');
          }
          if (!isMapChunkBody(value))
            throw new BadRequestException('Invalid page body');
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          for (const record of value) {
            const bounds = shapeBounds(record);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
          }
          if (
            minX < page.minX - pageBoundsTolerance ||
            minY < page.minY - pageBoundsTolerance ||
            maxX > page.maxX + pageBoundsTolerance ||
            maxY > page.maxY + pageBoundsTolerance
          )
            throw new BadRequestException(
              'Page bounds do not cover its objects',
            );
          pageBodies.set(`${page.cellX}:${page.cellY}:${page.pageId}`, value);
        }
        const updated = await tx.map.updateMany({
          where: { id: mapId, accountId, revision: commit.expectedRevision },
          data: { revision: { increment: 1 } },
        });
        if (!updated.count)
          throw new ConflictException('Map changed; reopen it');

        if (commit.sourceMapId !== null) {
          if (!commit.sourceTilesReady)
            throw new BadRequestException('Source previews are not ready');
          const source = await tx.map.findFirst({
            where: {
              id: commit.sourceMapId,
              revision: commit.sourceRevision ?? -1,
              OR: [{ accountId }, { isPublished: true, isHidden: false }],
            },
            select: { body: true },
          });
          if (!source || !isMapSceneHeaderV4(JSON.parse(source.body)))
            throw new ConflictException('Source map changed');
          if (commit.expectedRevision !== 0)
            throw new BadRequestException('Destination is not empty');
          await tx.$executeRaw`INSERT INTO "map_scene_pages" SELECT ${mapId}, "cell_x", "cell_y", "page_id", "min_x", "min_y", "max_x", "max_y", "body" FROM "map_scene_pages" WHERE "map_id" = ${commit.sourceMapId}`;
          await tx.$executeRaw`INSERT INTO "map_scene_texture_refs" SELECT ${mapId}, "cell_x", "cell_y", "page_id", "texture_id" FROM "map_scene_texture_refs" WHERE "map_id" = ${commit.sourceMapId}`;
          await tx.$executeRaw`INSERT INTO "map_scene_objects" SELECT ${mapId}, "object_id", "node_id", "parent_id", "kind", "name", "min_x", "min_y", "max_x", "max_y", "part_count" FROM "map_scene_objects" WHERE "map_id" = ${commit.sourceMapId}`;
          await tx.$executeRaw`INSERT INTO "map_scene_object_parts" SELECT ${mapId}, "object_id", "part_id", "cell_x", "cell_y", "page_id", "min_x", "min_y", "max_x", "max_y" FROM "map_scene_object_parts" WHERE "map_id" = ${commit.sourceMapId}`;
          await tx.$executeRaw`INSERT INTO "map_scene_containers" ("map_id", "id", "parent_id", "kind", "name", "visible", "locked", "order_key", "child_index") SELECT ${mapId}, "id", "parent_id", "kind", "name", "visible", "locked", "order_key", "child_index" FROM "map_scene_containers" WHERE "map_id" = ${commit.sourceMapId} ON CONFLICT ("map_id", "id") DO NOTHING`;
        }

        const previousContainers = await tx.mapSceneContainer.findMany({
          where: { mapId, id: { in: dto.containers.map((item) => item.id) } },
          select: {
            id: true,
            parentId: true,
            visible: true,
            orderKey: true,
            childIndex: true,
          },
        });
        const previousById = new Map(
          previousContainers.map((item) => [item.id, item]),
        );
        const visualContainerIds: string[] = [];
        const previousVisualBounds = new Map<string, WorldBounds>();
        for (const container of dto.containers) {
          const previous = previousById.get(container.id);
          if (
            !previous ||
            (!container.deleted &&
              previous.visible === container.visible &&
              previous.parentId === (container.parentId ?? null) &&
              previous.orderKey === container.orderKey &&
              previous.childIndex === container.childIndex)
          )
            continue;
          visualContainerIds.push(container.id);
          const bounds = await sceneContainerCoverage(tx, mapId, container.id);
          if (bounds) previousVisualBounds.set(container.id, bounds);
        }
        const deletedContainers: string[] = [];
        for (const container of dto.containers) {
          if (container.deleted) {
            if (container.id === header.rootId)
              throw new BadRequestException('Cannot delete root');
            deletedContainers.push(container.id);
            continue;
          }
          await tx.mapSceneContainer.upsert({
            where: { mapId_id: { mapId, id: container.id } },
            create: {
              mapId,
              id: container.id,
              parentId: container.parentId ?? null,
              kind: container.kind,
              name: container.name,
              visible: container.visible,
              locked: container.locked,
              orderKey: container.orderKey,
              childIndex: container.childIndex,
            },
            update: {
              parentId: container.parentId ?? null,
              kind: container.kind,
              name: container.name,
              visible: container.visible,
              locked: container.locked,
              orderKey: container.orderKey,
              childIndex: container.childIndex,
            },
          });
        }
        const root = await tx.mapSceneContainer.findUnique({
          where: { mapId_id: { mapId, id: header.rootId } },
        });
        if (!root || root.parentId !== null)
          throw new BadRequestException('Missing map root');
        const parentCache = new Map<string, string | null>([[root.id, null]]);
        for (const container of dto.containers) {
          if (container.deleted) continue;
          const visited = new Set<string>();
          let current: string | null = container.id;
          while (current !== null && current !== root.id) {
            if (visited.has(current) || visited.size >= 64)
              throw new BadRequestException(
                'Container nesting is cyclic or too deep',
              );
            visited.add(current);
            let parentId = parentCache.get(current);
            if (parentId === undefined) {
              const node: { parentId: string | null } | null =
                await tx.mapSceneContainer.findUnique({
                  where: { mapId_id: { mapId, id: current } },
                  select: { parentId: true },
                });
              if (!node)
                throw new BadRequestException('Missing container parent');
              parentId = node.parentId;
              parentCache.set(current, parentId);
            }
            current = parentId;
          }
          if (current !== root.id)
            throw new BadRequestException('Container is outside the map root');
        }

        const changed = new Set<string>();
        const previousTextureIds = new Set<string>();
        const oldMetadata = new Map<
          string,
          { nodeId: string; parentId: string; kind: string; name: string }
        >();
        const newMetadata = new Map<
          string,
          { nodeId: string; parentId: string; kind: string; name: string }
        >();
        const dirty = new Set<string>();
        for (const page of initialMap ? [] : commit.pages) {
          const key: PageKey = {
            cellX: page.cellX,
            cellY: page.cellY,
            pageId: page.pageId,
          };
          const previous = await tx.mapScenePage.findUnique({
            where: { mapId_cellX_cellY_pageId: { mapId, ...key } },
          });
          if (previous)
            affectedPreviewTiles(
              {
                x: previous.minX,
                y: previous.minY,
                width: previous.maxX - previous.minX,
                height: previous.maxY - previous.minY,
              },
              dirty,
            );
          const oldTextures = await tx.mapSceneTextureRef.findMany({
            where: { mapId, ...key },
            select: { textureId: true },
          });
          for (const item of oldTextures)
            previousTextureIds.add(item.textureId);
          const oldParts = await tx.mapSceneObjectPart.findMany({
            where: { mapId, ...key },
            select: { objectId: true },
          });
          for (const part of oldParts) changed.add(part.objectId);
          await tx.mapSceneObjectPart.deleteMany({ where: { mapId, ...key } });
          await tx.mapScenePage.deleteMany({ where: { mapId, ...key } });
        }
        if (changed.size) {
          const old = await tx.mapSceneObject.findMany({
            where: { mapId, objectId: { in: [...changed] } },
          });
          for (const item of old) oldMetadata.set(item.objectId, item);
        }

        const newPages: PageRow[] = [];
        const newParts: ObjectPartRow[] = [];
        const newTextureRefs: TextureRefRow[] = [];
        for (const page of commit.pages) {
          if (page.deleted) continue;
          const key: PageKey = {
            cellX: page.cellX,
            cellY: page.cellY,
            pageId: page.pageId,
          };
          affectedPreviewTiles(
            {
              x: page.minX,
              y: page.minY,
              width: page.maxX - page.minX,
              height: page.maxY - page.minY,
            },
            dirty,
          );
          const body = pageBodies.get(
            `${page.cellX}:${page.cellY}:${page.pageId}`,
          );
          if (!body) throw new BadRequestException('Invalid page body');
          const textureIds = new Set(
            body
              .map(referencedTextureId)
              .filter((id): id is string => id !== null),
          );
          for (const textureId of textureIds) {
            const texture = await tx.texture.findUnique({
              where: { id: textureId },
              select: {
                accountId: true,
                deletedAt: true,
                pack: {
                  select: {
                    isPublished: true,
                    isHidden: true,
                    deletedAt: true,
                  },
                },
              },
            });
            if (!texture) throw new BadRequestException('Texture not found');
            const active =
              texture.deletedAt === null && texture.pack.deletedAt === null;
            if (
              !previousTextureIds.has(textureId) &&
              !(
                active &&
                (texture.accountId === accountId ||
                  (texture.pack.isPublished && !texture.pack.isHidden))
              )
            )
              throw new BadRequestException(
                'Texture is not available for this map',
              );
          }
          const pageData: PageRow = {
            mapId,
            ...key,
            minX: page.minX,
            minY: page.minY,
            maxX: page.maxX,
            maxY: page.maxY,
            body: page.body,
          };
          if (initialMap) newPages.push(pageData);
          else await tx.mapScenePage.create({ data: pageData });
          if (textureIds.size) {
            const refs = [...textureIds].map((textureId) => ({
              mapId,
              ...key,
              textureId,
            }));
            if (initialMap) newTextureRefs.push(...refs);
            else await tx.mapSceneTextureRef.createMany({ data: refs });
          }
          const objectParts: ObjectPartRow[] = [];
          for (const record of body) {
            const id = objectId(record);
            changed.add(id);
            const bounds = shapeBounds(record);
            if (
              ![bounds.x, bounds.y, bounds.width, bounds.height].every(
                Number.isFinite,
              ) ||
              bounds.width < 0 ||
              bounds.height < 0
            )
              throw new BadRequestException('Invalid object bounds');
            if (
              mapCellOf(bounds.x) !== page.cellX ||
              mapCellOf(bounds.y) !== page.cellY ||
              bounds.x < -mapWorldHalfSize ||
              bounds.y < -mapWorldHalfSize ||
              bounds.x + bounds.width > mapWorldHalfSize ||
              bounds.y + bounds.height > mapWorldHalfSize
            )
              throw new BadRequestException(
                'Object is outside its page or the world',
              );
            objectParts.push({
              mapId,
              objectId: id,
              partId: record.shape['id'] as string,
              ...key,
              minX: bounds.x,
              minY: bounds.y,
              maxX: bounds.x + bounds.width,
              maxY: bounds.y + bounds.height,
            });
            newMetadata.set(id, {
              nodeId: record.node['id'] as string,
              parentId: record.parentId,
              kind: record.shape['type'] as string,
              name:
                typeof record.shape['name'] === 'string'
                  ? record.shape['name']
                  : 'Объект',
            });
          }
          if (initialMap) newParts.push(...objectParts);
          else await tx.mapSceneObjectPart.createMany({ data: objectParts });
        }
        for (let start = 0; start < newPages.length; start += 100)
          await tx.mapScenePage.createMany({
            data: newPages.slice(start, start + 100),
          });
        for (let start = 0; start < newTextureRefs.length; start += 500)
          await tx.mapSceneTextureRef.createMany({
            data: newTextureRefs.slice(start, start + 500),
          });
        for (let start = 0; start < newParts.length; start += 500)
          await tx.mapSceneObjectPart.createMany({
            data: newParts.slice(start, start + 500),
          });

        const groupedParts = changed.size
          ? await tx.mapSceneObjectPart.groupBy({
              by: ['objectId'],
              where: { mapId, objectId: { in: [...changed] } },
              _min: { minX: true, minY: true },
              _max: { maxX: true, maxY: true },
              _count: { _all: true },
            })
          : [];
        const partsByObject = new Map(
          groupedParts.map((parts) => [parts.objectId, parts]),
        );
        const parentIds = new Set(
          [...newMetadata.values(), ...oldMetadata.values()].map(
            (item) => item.parentId,
          ),
        );
        const parents = await tx.mapSceneContainer.findMany({
          where: { mapId, id: { in: [...parentIds] } },
          select: { id: true },
        });
        const existingParents = new Set(parents.map((parent) => parent.id));
        const newObjects: {
          mapId: number;
          objectId: string;
          nodeId: string;
          parentId: string;
          kind: string;
          name: string;
          minX: number;
          minY: number;
          maxX: number;
          maxY: number;
          partCount: number;
        }[] = [];
        for (const id of changed) {
          const parts = partsByObject.get(id);
          if (!parts) {
            await tx.mapSceneObject.deleteMany({
              where: { mapId, objectId: id },
            });
            continue;
          }
          const metadata = newMetadata.get(id) ?? oldMetadata.get(id);
          if (!metadata)
            throw new BadRequestException('Missing object metadata');
          const data = {
            ...metadata,
            minX: parts._min.minX ?? 0,
            minY: parts._min.minY ?? 0,
            maxX: parts._max.maxX ?? 0,
            maxY: parts._max.maxY ?? 0,
            partCount: parts._count._all,
          };
          if (!existingParents.has(data.parentId))
            throw new BadRequestException('Missing object container');
          if (initialMap) {
            newObjects.push({ mapId, objectId: id, ...data });
            continue;
          }
          await tx.mapSceneObject.upsert({
            where: { mapId_objectId: { mapId, objectId: id } },
            create: { mapId, objectId: id, ...data },
            update: data,
          });
        }
        for (let start = 0; start < newObjects.length; start += 1000)
          await tx.mapSceneObject.createMany({
            data: newObjects.slice(start, start + 1000),
          });

        for (const id of deletedContainers) {
          const [objects, children] = await Promise.all([
            tx.mapSceneObject.count({ where: { mapId, parentId: id } }),
            tx.mapSceneContainer.count({ where: { mapId, parentId: id } }),
          ]);
          if (objects || children)
            throw new BadRequestException(
              'Container still has objects or child containers',
            );
          await tx.mapSceneContainer.deleteMany({ where: { mapId, id } });
        }

        for (const id of visualContainerIds) {
          const previousBounds = previousVisualBounds.get(id);
          if (previousBounds) affectedPreviewTiles(previousBounds, dirty);
          const nextBounds = await sceneContainerCoverage(tx, mapId, id);
          if (nextBounds) affectedPreviewTiles(nextBounds, dirty);
        }

        const staged = new Set(
          commit.tiles.map((tile) => `${tile.level}:${tile.x}:${tile.y}`),
        );
        if ([...dirty].some((key) => !staged.has(key)))
          throw new BadRequestException('Missing changed preview tiles');
        if (initialMap) {
          for (let start = 0; start < commit.tiles.length; start += 1000)
            await tx.mapSceneTile.createMany({
              data: commit.tiles.slice(start, start + 1000).map((tile) => ({
                mapId,
                level: tile.level,
                x: tile.x,
                y: tile.y,
                objectKey: tile.objectKey,
                version: commit.expectedRevision + 1,
              })),
            });
        }
        if (!initialMap)
          for (let start = 0; start < commit.tiles.length; start += 100) {
            const batch = commit.tiles.slice(start, start + 100);
            const keys = batch.map(({ level, x, y }) => ({ level, x, y }));
            const previous = await tx.mapSceneTile.findMany({
              where: { mapId, OR: keys },
              select: { level: true, x: true, y: true, objectKey: true },
            });
            const nextKeys = new Map(
              batch.map((tile) => [
                `${tile.level}:${tile.x}:${tile.y}`,
                tile.objectKey,
              ]),
            );
            const replacedKeys = previous.flatMap((tile) =>
              tile.objectKey &&
              tile.objectKey !==
                nextKeys.get(`${tile.level}:${tile.x}:${tile.y}`)
                ? [tile.objectKey]
                : [],
            );
            if (replacedKeys.length)
              await queueSceneBlobCleanup(tx, replacedKeys);
            await tx.mapSceneTile.deleteMany({ where: { mapId, OR: keys } });
            await tx.mapSceneTile.createMany({
              data: batch.map((tile) => ({
                mapId,
                level: tile.level,
                x: tile.x,
                y: tile.y,
                objectKey: tile.objectKey,
                version: commit.expectedRevision + 1,
              })),
            });
          }

        const aggregate = await tx.mapSceneObject.aggregate({
          where: { mapId },
          _min: { minX: true, minY: true },
          _max: { maxX: true, maxY: true },
        });
        const x = Math.min(
          header.bounds.x,
          aggregate._min.minX ?? header.bounds.x,
        );
        const y = Math.min(
          header.bounds.y,
          aggregate._min.minY ?? header.bounds.y,
        );
        const bounds = {
          x,
          y,
          width: Math.max(
            1,
            Math.max(
              header.bounds.x + header.bounds.width,
              aggregate._max.maxX ?? header.bounds.x + header.bounds.width,
            ) - x,
          ),
          height: Math.max(
            1,
            Math.max(
              header.bounds.y + header.bounds.height,
              aggregate._max.maxY ?? header.bounds.y + header.bounds.height,
            ) - y,
          ),
        };
        const savedHeader = { ...header, bootstrap: [], bounds };
        await tx.map.update({
          where: { id: mapId },
          data: { body: JSON.stringify(savedHeader) },
        });
        await tx.mapSceneCommit.update({
          where: { id: commitId },
          data: { status: 'committed', header: JSON.stringify(savedHeader) },
        });
        await tx.mapSceneCommitPage.deleteMany({ where: { commitId } });
        await tx.mapSceneCommitTile.deleteMany({ where: { commitId } });
        return { revision: commit.expectedRevision + 1 };
      },
      { isolationLevel: 'RepeatableRead', timeout: 120_000 },
    );
  }
}
