import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaMainService } from '@wm/api/database-main';
import { OBJECT_STORAGE, ObjectStorage } from '@wm/api/shared';
import { SaveSceneDto } from './map-scene.dto';
import { isMapChunkBody, isMapSceneManifest } from '@wm/shared/workshop';

export function sceneChunkKeys(raw: string) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BadRequestException('Invalid manifest');
  }
  if (!isMapSceneManifest(value))
    throw new BadRequestException('Invalid manifest');
  return value.chunks.map((chunk) => chunk.key);
}

@Injectable()
export class MapSceneService {
  constructor(
    private readonly prisma: PrismaMainService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async chunk(id: number, key: string, revision: number, accountId?: number) {
    if (!/^-?\d+:-?\d+$/.test(key) || revision < 0)
      throw new BadRequestException('Invalid chunk request');
    const map = await this.#readable(id, accountId);
    if (map.revision !== revision)
      throw new ConflictException('Map changed; reopen it');
    const chunk = await this.prisma.mapChunk.findFirst({
      where: { mapId: id, key, map: { revision } },
    });
    if (!chunk) throw new NotFoundException('Chunk not found');
    return { key, body: chunk.body, revision };
  }

  async overview(id: number, accountId?: number) {
    const map = await this.#readable(id, accountId);
    if (!map.overviewKey) throw new NotFoundException('Overview not found');
    return this.storage.get(map.overviewKey);
  }

  async save(id: number, accountId: number, dto: SaveSceneDto) {
    const owned = await this.prisma.map.findFirst({
      where: { id, accountId },
      select: { id: true, overviewKey: true },
    });
    if (!owned) throw new NotFoundException('Map not found');
    const keys = sceneChunkKeys(dto.manifest);
    const supplied = new Set(dto.chunks.map((chunk) => chunk.key));
    if (
      supplied.size !== dto.chunks.length ||
      dto.chunks.some((chunk) => !keys.includes(chunk.key))
    )
      throw new BadRequestException('Invalid chunk set');
    for (const chunk of dto.chunks) {
      let value: unknown;
      try {
        value = JSON.parse(chunk.body);
      } catch {
        throw new BadRequestException('Invalid chunk body');
      }
      if (!isMapChunkBody(value))
        throw new BadRequestException('Invalid chunk body');
    }
    let overviewKey: string | undefined;
    if (dto.overview) {
      if (!dto.overview.startsWith('data:image/png;base64,'))
        throw new BadRequestException('Invalid overview');
      const bytes = Buffer.from(dto.overview.slice(22), 'base64');
      if (
        bytes.length > 4_000_000 ||
        bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      )
        throw new BadRequestException('Invalid overview');
      overviewKey = `maps/${id}/overview-${randomUUID()}.png`;
      await this.storage.put({
        key: overviewKey,
        body: bytes,
        contentType: 'image/png',
      });
    }
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.map.updateMany({
          where: { id, accountId, revision: dto.revision },
          data: {
            body: dto.manifest,
            revision: { increment: 1 },
            ...(overviewKey ? { overviewKey } : {}),
          },
        });
        if (!changed.count)
          throw new ConflictException('Map changed; reopen it before saving');
        const existing = await tx.mapChunk.findMany({
          where: { mapId: id },
          select: { key: true },
        });
        const available = new Set([
          ...existing.map((chunk) => chunk.key),
          ...supplied,
        ]);
        if (keys.some((key) => !available.has(key)))
          throw new BadRequestException('Missing chunk data');
        for (const chunk of dto.chunks) {
          await tx.mapChunk.upsert({
            where: { mapId_key: { mapId: id, key: chunk.key } },
            create: { mapId: id, key: chunk.key, body: chunk.body },
            update: { body: chunk.body },
          });
        }
        await tx.mapChunk.deleteMany({
          where: { mapId: id, key: { notIn: keys } },
        });
        return { revision: dto.revision + 1 };
      });
      if (overviewKey && owned.overviewKey)
        await this.storage.delete(owned.overviewKey).catch(() => undefined);
      return result;
    } catch (error) {
      if (overviewKey)
        await this.storage.delete(overviewKey).catch(() => undefined);
      throw error;
    }
  }

  async copy(destinationId: number, accountId: number, sourceId: number) {
    if (destinationId === sourceId)
      throw new BadRequestException('A map cannot copy itself');
    const source = await this.prisma.map.findFirst({
      where: {
        id: sourceId,
        OR: [{ accountId }, { isPublished: true, isHidden: false }],
      },
      select: { id: true, revision: true, overviewKey: true },
    });
    const destination = await this.prisma.map.findFirst({
      where: { id: destinationId, accountId, revision: 0 },
      select: { id: true },
    });
    if (!source || !destination) throw new NotFoundException('Map not found');

    let overviewKey: string | undefined;
    try {
      if (source.overviewKey) {
        overviewKey = `maps/${destinationId}/overview-${randomUUID()}.png`;
        const bytes = await this.storage.get(source.overviewKey);
        await this.storage.put({
          key: overviewKey,
          body: bytes,
          contentType: 'image/png',
        });
      }
      return await this.prisma.$transaction(
        async (tx) => {
          const currentSource = await tx.map.findFirst({
            where: {
              id: sourceId,
              revision: source.revision,
              OR: [{ accountId }, { isPublished: true, isHidden: false }],
            },
            select: { body: true },
          });
          if (!currentSource)
            throw new ConflictException('Source map changed; retry the copy');
          const updated = await tx.map.updateMany({
            where: { id: destinationId, accountId, revision: 0 },
            data: {
              body: currentSource.body,
              revision: { increment: 1 },
              ...(overviewKey ? { overviewKey } : {}),
            },
          });
          if (!updated.count)
            throw new ConflictException(
              'Destination map changed; retry the copy',
            );
          await tx.$executeRaw`INSERT INTO "map_chunks" ("map_id", "key", "body") SELECT ${destinationId}, "key", "body" FROM "map_chunks" WHERE "map_id" = ${sourceId}`;
          return { revision: 1 };
        },
        { isolationLevel: 'RepeatableRead' },
      );
    } catch (error) {
      if (overviewKey)
        await this.storage.delete(overviewKey).catch(() => undefined);
      throw error;
    }
  }

  async #readable(id: number, accountId?: number) {
    const map = await this.prisma.map.findFirst({
      where: {
        id,
        OR: [
          { accountId: accountId ?? -1 },
          { isPublished: true, isHidden: false },
        ],
      },
      select: { revision: true, overviewKey: true },
    });
    if (!map) throw new NotFoundException('Map not found');
    return map;
  }
}
