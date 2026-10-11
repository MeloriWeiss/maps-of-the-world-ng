import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaMainService } from '@wm/api/database-main';
import { OBJECT_STORAGE, ObjectStorage } from '@wm/api/shared';
import {
  isMapChunkBody,
  isMapSceneHeaderV4,
  MapSceneHeaderV4,
  mapCellOf,
  mapPreviewMaxLevel,
  mapChunkSize,
  mapWorldHalfSize,
} from '@wm/shared/workshop';
import {
  SceneContainersQueryDto,
  SceneObjectsQueryDto,
  ScenePagePartDto,
  SceneTileBlockQueryDto,
  SceneViewportQueryDto,
  StartSceneCommitDto,
} from './map-scene-v4.dto';
import { lockSceneCommit } from './scene-commit-lock';
import { queueSceneBlobCleanup } from './scene-blob-cleanup.service';
import { sceneContainerCoverage } from './map-scene-container-coverage';
import { isValidPreviewPng } from './preview-png';
import { Request } from 'express';
import { TextDecoder } from 'node:util';
import { consumeSceneUpload } from './scene-bundle-reader';

const pageLimit = 100;
const stagedPageBatchSize = 24;
const stagedTileBatchSize = 8;

@Injectable()
export class MapSceneV4Service {
  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async scene(mapId: number, accountId?: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        const header: unknown = JSON.parse(map.body);
        if (!isMapSceneHeaderV4(header))
          throw new BadRequestException('Unsupported map scene');
        const level = Math.min(
          mapPreviewMaxLevel,
          Math.max(
            0,
            Math.ceil(
              Math.log2(
                Math.max(header.bounds.width, header.bounds.height) /
                  (4 * mapChunkSize),
              ),
            ),
          ),
        );
        const size = mapChunkSize * 2 ** level;
        const tiles = await tx.mapSceneTile.findMany({
          where: {
            mapId,
            level,
            x: {
              gte: Math.floor(header.bounds.x / size),
              lte: Math.floor((header.bounds.x + header.bounds.width) / size),
            },
            y: {
              gte: Math.floor(header.bounds.y / size),
              lte: Math.floor((header.bounds.y + header.bounds.height) / size),
            },
          },
          take: 16,
          select: { level: true, x: true, y: true, version: true },
        });
        return { ...header, bootstrap: tiles, revision: map.revision };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async pages(mapId: number, query: SceneViewportQueryDto, accountId?: number) {
    this.#checkViewport(query);
    return this.prisma.$transaction(
      async (tx) => {
        const map = await tx.map.findFirst({
          where: {
            id: mapId,
            OR: [
              { accountId: accountId ?? -1 },
              { isPublished: true, isHidden: false },
            ],
          },
          select: { revision: true },
        });
        if (!map) throw new NotFoundException('Map not found');
        if (map.revision !== query.revision)
          throw new ConflictException('Map changed; reopen it');
        const rows = await tx.mapScenePage.findMany({
          where: {
            mapId,
            minX: { lt: query.x + query.width },
            maxX: { gt: query.x },
            minY: { lt: query.y + query.height },
            maxY: { gt: query.y },
          },
          orderBy: [{ cellX: 'asc' }, { cellY: 'asc' }, { pageId: 'asc' }],
          ...(query.cursor
            ? {
                cursor: {
                  mapId_cellX_cellY_pageId: this.#pageCursor(
                    mapId,
                    query.cursor,
                  ),
                },
                skip: 1,
              }
            : {}),
          take: Math.min(query.limit, pageLimit) + 1,
          select: {
            cellX: true,
            cellY: true,
            pageId: true,
            minX: true,
            minY: true,
            maxX: true,
            maxY: true,
          },
        });
        const items = rows.slice(0, query.limit);
        if (query.includeBody && query.limit > 24)
          throw new BadRequestException('Body page limit is 24');
        const bodies =
          query.includeBody && items.length
            ? await tx.mapScenePage.findMany({
                where: {
                  mapId,
                  OR: items.map((item) => ({
                    cellX: item.cellX,
                    cellY: item.cellY,
                    pageId: item.pageId,
                  })),
                },
                select: { cellX: true, cellY: true, pageId: true, body: true },
              })
            : [];
        const byKey = new Map(
          bodies.map((item) => [
            `${item.cellX}:${item.cellY}:${item.pageId}`,
            item.body,
          ]),
        );
        return {
          items: items.map(({ minX, minY, maxX, maxY, ...page }) => ({
            ...page,
            bounds: {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            },
            ...(query.includeBody
              ? {
                  body: byKey.get(`${page.cellX}:${page.cellY}:${page.pageId}`),
                }
              : {}),
          })),
          nextCursor:
            rows.length > query.limit
              ? this.#encodeCursor([
                  items.at(-1)?.cellX,
                  items.at(-1)?.cellY,
                  items.at(-1)?.pageId,
                ])
              : null,
          complete: rows.length <= query.limit,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async page(
    mapId: number,
    cellX: number,
    cellY: number,
    pageId: number,
    revision: number,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await tx.map.findFirst({
          where: {
            id: mapId,
            OR: [
              { accountId: accountId ?? -1 },
              { isPublished: true, isHidden: false },
            ],
          },
          select: { revision: true },
        });
        if (!map) throw new NotFoundException('Map not found');
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        const row = await tx.mapScenePage.findUnique({
          where: { mapId_cellX_cellY_pageId: { mapId, cellX, cellY, pageId } },
          select: { body: true },
        });
        if (!row) throw new NotFoundException('Page not found');
        return row;
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async objects(
    mapId: number,
    query: SceneObjectsQueryDto,
    accountId?: number,
  ) {
    if (query.scope === 'map') {
      if ((query.query?.trim().length ?? 0) < 2)
        throw new BadRequestException(
          'Enter at least two characters to search the whole map',
        );
    } else this.#checkViewport(query);
    return this.prisma.$transaction(
      async (tx) => {
        const map = await tx.map.findFirst({
          where: {
            id: mapId,
            OR: [
              { accountId: accountId ?? -1 },
              { isPublished: true, isHidden: false },
            ],
          },
          select: { revision: true },
        });
        if (!map) throw new NotFoundException('Map not found');
        if (map.revision !== query.revision)
          throw new ConflictException('Map changed; reopen it');
        const rows = await tx.mapSceneObject.findMany({
          where: {
            mapId,
            ...(query.scope === 'map'
              ? {}
              : {
                  minX: { lt: query.x + query.width },
                  maxX: { gt: query.x },
                  minY: { lt: query.y + query.height },
                  maxY: { gt: query.y },
                }),
            ...(query.kind ? { kind: query.kind } : {}),
            ...(query.query
              ? {
                  name: {
                    startsWith: query.query,
                    mode: 'insensitive' as const,
                  },
                }
              : {}),
          },
          orderBy: { objectId: 'asc' },
          ...(query.cursor
            ? {
                cursor: { mapId_objectId: { mapId, objectId: query.cursor } },
                skip: 1,
              }
            : {}),
          take: query.limit + 1,
        });
        const items = rows.slice(0, query.limit);
        return {
          items,
          nextCursor: rows.length > query.limit ? items.at(-1)?.objectId : null,
          complete: rows.length <= query.limit,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async object(
    mapId: number,
    objectId: string,
    revision: number,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        const item = await tx.mapSceneObject.findUnique({
          where: { mapId_objectId: { mapId, objectId } },
        });
        if (!item) throw new NotFoundException('Object not found');
        const parts = await tx.mapSceneObjectPart.findMany({
          where: { mapId, objectId },
          orderBy: { partId: 'asc' },
          take: 100,
        });
        return { ...item, parts, hasMoreParts: item.partCount > parts.length };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async containers(
    mapId: number,
    query: SceneContainersQueryDto,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== query.revision)
          throw new ConflictException('Map changed; reopen it');
        const rows = await tx.mapSceneContainer.findMany({
          where: { mapId, parentId: query.parentId ?? null },
          orderBy: [{ orderKey: 'asc' }, { childIndex: 'asc' }, { id: 'asc' }],
          ...(query.cursor
            ? { cursor: { mapId_id: { mapId, id: query.cursor } }, skip: 1 }
            : {}),
          take: query.limit + 1,
        });
        const items = rows.slice(0, query.limit);
        return {
          items,
          nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
          complete: rows.length <= query.limit,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async containerPath(
    mapId: number,
    containerId: string,
    revision: number,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        const path = [];
        let id: string | null = containerId;
        for (let depth = 0; id !== null && depth < 64; depth++) {
          const item: {
            id: string;
            mapId: number;
            parentId: string | null;
            kind: string;
            name: string;
            visible: boolean;
            locked: boolean;
            orderKey: number;
            childIndex: number;
          } | null = await tx.mapSceneContainer.findUnique({
            where: { mapId_id: { mapId, id } },
          });
          if (!item) throw new NotFoundException('Container not found');
          path.unshift(item);
          id = item.parentId;
        }
        if (id !== null)
          throw new BadRequestException('Container nesting is too deep');
        return path;
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async containerCoverage(
    mapId: number,
    containerId: string,
    revision: number,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        const container = await tx.mapSceneContainer.findUnique({
          where: { mapId_id: { mapId, id: containerId } },
          select: { id: true },
        });
        if (!container) throw new NotFoundException('Container not found');
        return { bounds: await sceneContainerCoverage(tx, mapId, containerId) };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async tiles(
    mapId: number,
    query: SceneTileBlockQueryDto,
    accountId?: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== query.revision)
          throw new ConflictException('Map changed; reopen it');
        return tx.mapSceneTile.findMany({
          where: {
            mapId,
            level: query.level,
            x: { gte: query.x, lt: query.x + 8 },
            y: { gte: query.y, lt: query.y + 8 },
            objectKey: { not: null },
          },
          select: { level: true, x: true, y: true, version: true },
        });
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async tile(
    mapId: number,
    level: number,
    x: number,
    y: number,
    revision: number,
    accountId?: number,
  ) {
    if (!this.#validTileCoordinates(level, x, y))
      throw new BadRequestException('Invalid tile');
    const objectKey = await this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        const tile = await tx.mapSceneTile.findUnique({
          where: { mapId_level_x_y: { mapId, level, x, y } },
        });
        if (!tile?.objectKey) throw new NotFoundException('Tile not found');
        return tile.objectKey;
      },
      { isolationLevel: 'RepeatableRead' },
    );
    return this.storage.get(objectKey);
  }

  async tilePack(
    mapId: number,
    level: number,
    x: number,
    y: number,
    revision: number,
    mask: number,
    accountId?: number,
  ) {
    if (
      x % 2 !== 0 ||
      y % 2 !== 0 ||
      !Number.isInteger(mask) ||
      mask < 1 ||
      mask > 15 ||
      !this.#validTileCoordinates(level, x, y)
    )
      throw new BadRequestException('Invalid tile pack');
    const rows = await this.prisma.$transaction(
      async (tx) => {
        const map = await this.#readable(mapId, accountId, tx);
        if (map.revision !== revision)
          throw new ConflictException('Map changed; reopen it');
        return tx.mapSceneTile.findMany({
          where: {
            mapId,
            level,
            x: { gte: x, lt: x + 2 },
            y: { gte: y, lt: y + 2 },
            objectKey: { not: null },
          },
          select: { x: true, y: true, version: true, objectKey: true },
          orderBy: [{ y: 'asc' }, { x: 'asc' }],
          take: 4,
        });
      },
      { isolationLevel: 'RepeatableRead' },
    );
    const requested = rows.filter(
      (row) => (mask & (1 << ((row.y - y) * 2 + row.x - x))) !== 0,
    );
    const tiles = await Promise.all(
      requested.map(async (row) => {
        if (!row.objectKey) throw new NotFoundException('Tile has no image');
        return { ...row, png: await this.storage.get(row.objectKey) };
      }),
    );
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(tiles.length, 0);
    const parts: Buffer[] = [header];
    for (const tile of tiles) {
      const item = Buffer.allocUnsafe(16);
      item.writeInt32LE(tile.x, 0);
      item.writeInt32LE(tile.y, 4);
      item.writeUInt32LE(tile.version, 8);
      item.writeUInt32LE(tile.png.length, 12);
      parts.push(item, tile.png);
    }
    return Buffer.concat(parts);
  }

  async startCommit(
    mapId: number,
    accountId: number,
    dto: StartSceneCommitDto,
  ) {
    const map = await this.prisma.map.findFirst({
      where: { id: mapId, accountId },
      select: { revision: true },
    });
    if (!map) throw new NotFoundException('Map not found');
    const existing = await this.prisma.mapSceneCommit.findUnique({
      where: {
        mapId_idempotencyKey: { mapId, idempotencyKey: dto.idempotencyKey },
      },
    });
    if (existing) {
      if (
        existing.accountId !== accountId ||
        existing.expectedRevision !== dto.expectedRevision ||
        existing.sourceMapId !== (dto.sourceMapId ?? null) ||
        existing.sourceRevision !== (dto.sourceRevision ?? null)
      )
        throw new ConflictException('Map save key belongs to another request');
      return {
        id: existing.id,
        status: existing.status,
        revision:
          existing.status === 'committed'
            ? existing.expectedRevision + 1
            : undefined,
      };
    }
    if (map.revision !== dto.expectedRevision)
      throw new ConflictException('Map changed; reopen it');
    if (dto.sourceMapId !== undefined) {
      const source = await this.#readable(dto.sourceMapId, accountId);
      if (source.revision !== dto.sourceRevision)
        throw new ConflictException('Source map changed');
      if (dto.sourceMapId === mapId || dto.expectedRevision !== 0)
        throw new BadRequestException('Invalid scene copy');
    }
    const active = await this.prisma.mapSceneCommit.count({
      where: { accountId, status: 'uploading', expiresAt: { gt: new Date() } },
    });
    if (active >= 5) throw new ConflictException('Too many active map saves');
    const commit = await this.prisma.mapSceneCommit.create({
      data: {
        mapId,
        accountId,
        expectedRevision: dto.expectedRevision,
        sourceMapId: dto.sourceMapId,
        sourceRevision: dto.sourceRevision,
        idempotencyKey: dto.idempotencyKey,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
    return { id: commit.id, status: commit.status };
  }

  async commitStatus(mapId: number, accountId: number, commitId: string) {
    const commit = await this.#ownedCommit(mapId, accountId, commitId);
    return {
      id: commit.id,
      status: commit.status,
      revision:
        commit.status === 'committed' ? commit.expectedRevision + 1 : undefined,
    };
  }

  async copySourceTiles(mapId: number, accountId: number, commitId: string) {
    const commit = await this.#uploadableCommit(mapId, accountId, commitId);
    if (commit.sourceMapId === null || commit.sourceTilesReady)
      return { complete: true };
    const sourceMapId = commit.sourceMapId;
    const sourceRevision = commit.sourceRevision;
    const rows = await this.prisma.$transaction(
      async (tx) => {
        const source = await tx.map.findFirst({
          where: {
            id: sourceMapId,
            revision: sourceRevision ?? -1,
            OR: [{ accountId }, { isPublished: true, isHidden: false }],
          },
          select: { id: true },
        });
        if (!source) throw new ConflictException('Source map changed');
        const cursor = commit.copyCursor
          ? this.#tileCursor(sourceMapId, commit.copyCursor)
          : null;
        return tx.mapSceneTile.findMany({
          where: { mapId: sourceMapId },
          orderBy: [{ level: 'asc' }, { x: 'asc' }, { y: 'asc' }],
          ...(cursor ? { cursor: { mapId_level_x_y: cursor }, skip: 1 } : {}),
          take: 17,
        });
      },
      { isolationLevel: 'RepeatableRead' },
    );
    const batch = rows.slice(0, 16);
    const copied: {
      level: number;
      x: number;
      y: number;
      objectKey: string | null;
    }[] = [];
    const newKeys: string[] = [];
    const unused: string[] = [];
    try {
      for (const tile of batch) {
        let objectKey: string | null = null;
        if (tile.objectKey) {
          const bytes = await this.storage.get(tile.objectKey);
          const key = `maps/${mapId}/commits/${commitId}/copy-${tile.level}-${tile.x}-${tile.y}-${randomUUID()}.png`;
          objectKey = key;
          newKeys.push(key);
          await this.prisma.$transaction((tx) =>
            queueSceneBlobCleanup(tx, [key], 7_200_000),
          );
          await this.storage.put({
            key,
            body: bytes,
            contentType: 'image/png',
          });
        }
        copied.push({ level: tile.level, x: tile.x, y: tile.y, objectKey });
      }
      const complete = await this.prisma.$transaction(async (tx) => {
        const current = await lockSceneCommit(
          tx,
          mapId,
          accountId,
          commitId,
          true,
        );
        if (
          current.copyCursor !== commit.copyCursor ||
          current.sourceTilesReady
        ) {
          unused.push(...newKeys);
          return current.sourceTilesReady;
        }
        const source = await tx.map.findFirst({
          where: {
            id: sourceMapId,
            revision: sourceRevision ?? -1,
            OR: [{ accountId }, { isPublished: true, isHidden: false }],
          },
          select: { id: true },
        });
        if (!source) throw new ConflictException('Source map changed');
        for (const tile of copied) {
          const existing = await tx.mapSceneCommitTile.findUnique({
            where: {
              commitId_level_x_y: {
                commitId,
                level: tile.level,
                x: tile.x,
                y: tile.y,
              },
            },
          });
          if (existing) {
            if (tile.objectKey) unused.push(tile.objectKey);
            continue;
          }
          await tx.mapSceneCommitTile.create({ data: { commitId, ...tile } });
        }
        const last = batch.at(-1);
        const done = rows.length <= 16;
        await tx.mapSceneCommit.update({
          where: { id: commitId },
          data: {
            sourceTilesReady: done,
            copyCursor:
              !done && last
                ? this.#encodeCursor([last.level, last.x, last.y])
                : null,
          },
        });
        return done;
      });
      await Promise.all(
        unused.map((key) => this.storage.delete(key).catch(() => undefined)),
      );
      return { complete };
    } catch (error) {
      await Promise.all(
        newKeys.map((key) => this.storage.delete(key).catch(() => undefined)),
      );
      throw error;
    }
  }

  async stagePage(
    mapId: number,
    accountId: number,
    commitId: string,
    dto: ScenePagePartDto,
  ) {
    this.#validatePage(dto);
    await this.prisma.$transaction(async (tx) => {
      await lockSceneCommit(tx, mapId, accountId, commitId, true);
      await tx.mapSceneCommitPage.upsert({
        where: {
          commitId_cellX_cellY_pageId: {
            commitId,
            cellX: dto.cellX,
            cellY: dto.cellY,
            pageId: dto.pageId,
          },
        },
        create: {
          commitId,
          cellX: dto.cellX,
          cellY: dto.cellY,
          pageId: dto.pageId,
          minX: dto.minX,
          minY: dto.minY,
          maxX: dto.maxX,
          maxY: dto.maxY,
          body: dto.body,
          deleted: dto.deleted ?? false,
        },
        update: {
          minX: dto.minX,
          minY: dto.minY,
          maxX: dto.maxX,
          maxY: dto.maxY,
          body: dto.body,
          deleted: dto.deleted ?? false,
        },
      });
    });
    return { staged: true };
  }

  #validatePage(dto: ScenePagePartDto) {
    if (
      dto.minX >= dto.maxX ||
      dto.minY >= dto.maxY ||
      !Number.isFinite(dto.minX) ||
      !Number.isFinite(dto.minY) ||
      !Number.isFinite(dto.maxX) ||
      !Number.isFinite(dto.maxY) ||
      dto.minX < -mapWorldHalfSize ||
      dto.minY < -mapWorldHalfSize ||
      dto.maxX > mapWorldHalfSize ||
      dto.maxY > mapWorldHalfSize ||
      mapCellOf(dto.minX) !== dto.cellX ||
      mapCellOf(dto.minY) !== dto.cellY
    )
      throw new BadRequestException('Invalid page bounds');
    let body: unknown;
    try {
      body = JSON.parse(dto.body);
    } catch {
      throw new BadRequestException('Invalid page body');
    }
    if (
      !isMapChunkBody(body) ||
      body.length > 512 ||
      dto.body.length > 262_144 ||
      (!dto.deleted && body.length === 0) ||
      (dto.deleted && body.length !== 0)
    )
      throw new BadRequestException('Invalid page body');
    const ids = body.map((item) => item.shape['id']);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Duplicate page parts');
  }

  async stageBundle(
    mapId: number,
    accountId: number,
    commitId: string,
    request: Request,
  ) {
    if (
      request.headers['content-type']
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() !== 'application/vnd.wm.scene-bundle'
    )
      throw new BadRequestException('Invalid map bundle content type');
    const declared = Number(request.headers['content-length']);
    if (
      request.headers['content-length'] !== undefined &&
      (!Number.isSafeInteger(declared) ||
        declared < 0 ||
        declared > 270 * 1024 * 1024)
    )
      throw new BadRequestException('Map bundle exceeds limit');
    await this.#uploadableCommit(mapId, accountId, commitId);
    const seen = new Set<string>();
    const pendingPages: ScenePagePartDto[] = [];
    const pendingTiles: {
      level: number;
      x: number;
      y: number;
      bytes: Buffer;
    }[] = [];
    const flushPages = async () => {
      if (!pendingPages.length) return;
      await this.#stagePageBatch(
        mapId,
        accountId,
        commitId,
        pendingPages.splice(0),
      );
    };
    const flushTiles = async () => {
      if (!pendingTiles.length) return;
      await this.#stageTileBatch(
        mapId,
        accountId,
        commitId,
        pendingTiles.splice(0),
      );
    };
    const result = await consumeSceneUpload(request, async (frame, payload) => {
      const key = `${frame.kind}:${frame.partKey}`;
      if (seen.has(key))
        throw new BadRequestException('Duplicate map bundle part');
      seen.add(key);
      if (frame.kind === 'page') {
        await flushTiles();
        const { cellX, cellY, pageId, minX, minY, maxX, maxY } = frame;
        if (
          cellX === undefined ||
          cellY === undefined ||
          pageId === undefined ||
          minX === undefined ||
          minY === undefined ||
          maxX === undefined ||
          maxY === undefined ||
          pageId < 0 ||
          pageId > 2_147_483_647 ||
          frame.partKey !== `${cellX}:${cellY}:${pageId}`
        )
          throw new BadRequestException('Invalid map bundle page');
        let body: string;
        try {
          body = new TextDecoder('utf-8', { fatal: true }).decode(payload);
        } catch {
          throw new BadRequestException('Invalid map bundle page encoding');
        }
        const page: ScenePagePartDto = {
          kind: 'page',
          cellX,
          cellY,
          pageId,
          minX,
          minY,
          maxX,
          maxY,
          body,
          deleted: frame.deleted,
        };
        this.#validatePage(page);
        pendingPages.push(page);
        if (pendingPages.length >= stagedPageBatchSize) await flushPages();
      } else {
        await flushPages();
        const { level, x, y } = frame;
        if (
          level === undefined ||
          x === undefined ||
          y === undefined ||
          frame.partKey !== `${level}:${x}:${y}`
        )
          throw new BadRequestException('Invalid map bundle tile');
        if (
          !this.#validTileCoordinates(level, x, y) ||
          !isValidPreviewPng(payload)
        )
          throw new BadRequestException('Invalid tile');
        pendingTiles.push({ level, x, y, bytes: payload });
        if (pendingTiles.length >= stagedTileBatchSize) await flushTiles();
      }
    });
    await flushPages();
    await flushTiles();
    return result;
  }

  async #stagePageBatch(
    mapId: number,
    accountId: number,
    commitId: string,
    pages: ScenePagePartDto[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await lockSceneCommit(tx, mapId, accountId, commitId, true);
      const keys = pages.map(({ cellX, cellY, pageId }) => ({
        cellX,
        cellY,
        pageId,
      }));
      await tx.mapSceneCommitPage.deleteMany({ where: { commitId, OR: keys } });
      await tx.mapSceneCommitPage.createMany({
        data: pages.map((page) => ({
          commitId,
          cellX: page.cellX,
          cellY: page.cellY,
          pageId: page.pageId,
          minX: page.minX,
          minY: page.minY,
          maxX: page.maxX,
          maxY: page.maxY,
          body: page.body,
          deleted: page.deleted ?? false,
        })),
      });
    });
  }

  async #stageTileBatch(
    mapId: number,
    accountId: number,
    commitId: string,
    tiles: { level: number; x: number; y: number; bytes: Buffer }[],
  ) {
    await this.#uploadableCommit(mapId, accountId, commitId);
    const entries = tiles.map((tile) => ({
      ...tile,
      objectKey: `maps/${mapId}/commits/${commitId}/${tile.level}-${tile.x}-${tile.y}-${randomUUID()}.png`,
    }));
    await this.prisma.$transaction((tx) =>
      queueSceneBlobCleanup(
        tx,
        entries.map((entry) => entry.objectKey),
        7_200_000,
      ),
    );
    try {
      for (let start = 0; start < entries.length; start += 4)
        await Promise.all(
          entries.slice(start, start + 4).map((entry) =>
            this.storage.put({
              key: entry.objectKey,
              body: entry.bytes,
              contentType: 'image/png',
            }),
          ),
        );
      await this.prisma.$transaction(async (tx) => {
        await lockSceneCommit(tx, mapId, accountId, commitId, true);
        const keys = entries.map(({ level, x, y }) => ({ level, x, y }));
        const previous = await tx.mapSceneCommitTile.findMany({
          where: { commitId, OR: keys },
          select: { objectKey: true },
        });
        const previousKeys = previous.flatMap((item) =>
          item.objectKey ? [item.objectKey] : [],
        );
        if (previousKeys.length) await queueSceneBlobCleanup(tx, previousKeys);
        await tx.mapSceneCommitTile.deleteMany({
          where: { commitId, OR: keys },
        });
        await tx.mapSceneCommitTile.createMany({
          data: entries.map(({ level, x, y, objectKey }) => ({
            commitId,
            level,
            x,
            y,
            objectKey,
          })),
        });
      });
    } catch (error) {
      // Cleanup is already queued; delete eagerly when the batch did not stage.
      await Promise.all(
        entries.map((entry) =>
          this.storage.delete(entry.objectKey).catch(() => undefined),
        ),
      );
      throw error;
    }
  }

  async #readable(
    mapId: number,
    accountId?: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const map = await tx.map.findFirst({
      where: {
        id: mapId,
        OR: [
          { accountId: accountId ?? -1 },
          { isPublished: true, isHidden: false },
        ],
      },
      select: { body: true, revision: true },
    });
    if (!map) throw new NotFoundException('Map not found');
    return map;
  }

  async #ownedCommit(mapId: number, accountId: number, commitId: string) {
    const commit = await this.prisma.mapSceneCommit.findFirst({
      where: { id: commitId, mapId, accountId },
    });
    if (!commit) throw new NotFoundException('Map save not found');
    return commit;
  }

  async #uploadableCommit(mapId: number, accountId: number, commitId: string) {
    const commit = await this.#ownedCommit(mapId, accountId, commitId);
    if (commit.status !== 'uploading' || commit.expiresAt < new Date())
      throw new ConflictException('Map save is closed');
    return commit;
  }

  #checkViewport(query: SceneViewportQueryDto) {
    if (
      ![query.x, query.y, query.width, query.height].every(Number.isFinite) ||
      query.x < -mapWorldHalfSize ||
      query.y < -mapWorldHalfSize ||
      query.x + query.width > mapWorldHalfSize ||
      query.y + query.height > mapWorldHalfSize ||
      query.width * query.height > (mapChunkSize * 64) ** 2
    )
      throw new BadRequestException('Viewport is too large');
  }

  #validTileCoordinates(level: number, x: number, y: number) {
    if (
      !Number.isInteger(level) ||
      level < 0 ||
      level > mapPreviewMaxLevel ||
      !Number.isInteger(x) ||
      !Number.isInteger(y)
    )
      return false;
    const count = Math.ceil(mapWorldHalfSize / (mapChunkSize * 2 ** level));
    return x >= -count && x < count && y >= -count && y < count;
  }

  #pageCursor(mapId: number, cursor: string) {
    let values: unknown;
    try {
      values = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
    if (
      !Array.isArray(values) ||
      values.length !== 3 ||
      !values.every(Number.isInteger)
    )
      throw new BadRequestException('Invalid cursor');
    return {
      mapId,
      cellX: values[0] as number,
      cellY: values[1] as number,
      pageId: values[2] as number,
    };
  }

  #tileCursor(mapId: number, cursor: string) {
    const values: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      !Array.isArray(values) ||
      values.length !== 3 ||
      !values.every(Number.isInteger)
    )
      throw new BadRequestException('Invalid copy cursor');
    return {
      mapId,
      level: values[0] as number,
      x: values[1] as number,
      y: values[2] as number,
    };
  }

  #encodeCursor(values: unknown[]) {
    return Buffer.from(JSON.stringify(values)).toString('base64url');
  }
}
