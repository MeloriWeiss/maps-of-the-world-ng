import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { queueSceneBlobCleanup } from './scene-blob-cleanup.service';
import { MapCatalogQueryDto, SaveMapDto } from './maps.dto';
import { createEmptyMapSceneHeader } from '@wm/shared/workshop';

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaMainService) {}

  async listPublicCatalog(query: MapCatalogQueryDto, accountId?: number) {
    const where = { isPublished: true, isHidden: false };
    const [maps, total] = await this.prisma.$transaction([
      this.prisma.map.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          isPublished: true,
          likesCount: true,
          commentsCount: true,
          authorAccount: {
            select: {
              nickname: true,
              userId: true,
            },
          },
          _count: {
            select: {
              likes: { where: { accountId: accountId ?? -1 } },
            },
          },
        },
      }),
      this.prisma.map.count({ where }),
    ]);
    return {
      items: maps.map(({ authorAccount, _count, ...map }) => ({
        ...map,
        isLiked: _count.likes > 0,
        author: {
          id: authorAccount.userId,
          nickname: authorAccount.nickname,
        },
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getPublicMap(id: number, accountId?: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, isPublished: true, isHidden: false },
      select: {
        id: true,
        name: true,
        description: true,
        body: true,
        revision: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
        authorAccount: {
          select: {
            nickname: true,
            userId: true,
          },
        },
        _count: {
          select: {
            likes: { where: { accountId: accountId ?? -1 } },
          },
        },
      },
    });
    if (!map) throw new NotFoundException('Published map not found');

    const { authorAccount, _count, ...publishedMap } = map;
    return {
      ...publishedMap,
      isLiked: _count.likes > 0,
      author: {
        id: authorAccount.userId,
        nickname: authorAccount.nickname,
      },
    };
  }

  async like(id: number, accountId: number) {
    await this.#assertPublished(id);
    const result = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.mapLike.createMany({
        data: { accountId, mapId: id },
        skipDuplicates: true,
      });
      if (created.count > 0) {
        await transaction.map.update({
          where: { id },
          data: { likesCount: { increment: 1 } },
        });
      }
      return transaction.map.findUniqueOrThrow({
        where: { id },
        select: { likesCount: true },
      });
    });
    return { isLiked: true, likesCount: result.likesCount };
  }

  async unlike(id: number, accountId: number) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const removed = await transaction.mapLike.deleteMany({
        where: { accountId, mapId: id },
      });
      if (removed.count > 0) {
        await transaction.map.updateMany({
          where: { id, likesCount: { gt: 0 } },
          data: { likesCount: { decrement: 1 } },
        });
      }
      return transaction.map.findUnique({
        where: { id },
        select: { likesCount: true },
      });
    });
    if (!result) throw new NotFoundException('Map not found');
    return { isLiked: false, likesCount: result.likesCount };
  }

  create(accountId: number, dto: SaveMapDto) {
    if (dto.body)
      throw new BadRequestException('Map scene is saved separately');
    return this.prisma.map.create({
      data: {
        name: dto.name,
        description: dto.description,
        body: JSON.stringify(createEmptyMapSceneHeader()),
        accountId,
        sceneContainers: {
          create: {
            id: 'map-root',
            parentId: null,
            kind: 'layer',
            name: 'Карта',
            visible: true,
            locked: false,
            orderKey: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
      },
    });
  }

  async update(id: number, accountId: number, dto: SaveMapDto) {
    if (dto.body)
      throw new BadRequestException('Map scene is saved separately');
    const result = await this.prisma.map.updateMany({
      where: { id, accountId },
      data: { name: dto.name, description: dto.description },
    });
    if (result.count === 0) throw new NotFoundException('Map not found');
    return this.prisma.map.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
      },
    });
  }

  async getOwned(id: number, accountId: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, accountId },
      select: {
        id: true,
        name: true,
        description: true,
        body: true,
        revision: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
      },
    });
    if (!map) throw new NotFoundException('Map not found');
    return map;
  }

  listMine(accountId: number) {
    return this.prisma.map.findMany({
      where: { accountId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
      },
    });
  }

  async listPublicByAuthor(authorUserId: number, accountId?: number) {
    const maps = await this.prisma.map.findMany({
      where: {
        isPublished: true,
        isHidden: false,
        authorAccount: { userId: authorUserId },
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        likesCount: true,
        commentsCount: true,
        _count: {
          select: {
            likes: { where: { accountId: accountId ?? -1 } },
          },
        },
      },
    });
    return maps.map(({ _count, ...map }) => ({
      ...map,
      isLiked: _count.likes > 0,
    }));
  }

  async updatePublication(id: number, accountId: number, isPublished: boolean) {
    const result = await this.prisma.map.updateMany({
      where: { id, accountId },
      data: { isPublished },
    });
    if (result.count === 0) throw new NotFoundException('Map not found');
    return { id, isPublished };
  }

  async removeOwned(id: number, accountId: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, accountId },
      select: { id: true, overviewKey: true },
    });
    if (!map) throw new NotFoundException('Map not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "map_scene_blob_cleanup" ("object_key", "not_before")
        SELECT "object_key", NOW() + INTERVAL '5 minutes' FROM "map_scene_tiles"
        WHERE "map_id" = ${id} AND "object_key" IS NOT NULL
        UNION SELECT t."object_key", NOW() + INTERVAL '5 minutes'
        FROM "map_scene_commit_tiles" t JOIN "map_scene_commits" c ON c."id" = t."commit_id"
        WHERE c."map_id" = ${id} AND t."object_key" IS NOT NULL
        ON CONFLICT ("object_key") DO NOTHING`;
      if (map.overviewKey) await queueSceneBlobCleanup(tx, [map.overviewKey]);
      await tx.mapComment.deleteMany({ where: { mapId: id } });
      await tx.map.delete({ where: { id } });
    });
    return { id };
  }

  async #assertPublished(id: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, isPublished: true, isHidden: false },
      select: { id: true },
    });
    if (!map) throw new NotFoundException('Published map not found');
  }
}
