import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { SaveMapDto } from './maps.dto';

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaMainService) {}

  listPublicCatalog(accountId?: number) {
    return this.prisma.map
      .findMany({
        where: { isPublished: true },
        orderBy: { id: 'desc' },
        take: 50,
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
      })
      .then((maps) =>
        maps.map(({ authorAccount, _count, ...map }) => ({
          ...map,
          isLiked: _count.likes > 0,
          author: {
            id: authorAccount.userId,
            nickname: authorAccount.nickname,
          },
        })),
      );
  }

  async getPublicMap(id: number, accountId?: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, isPublished: true },
      select: {
        id: true,
        name: true,
        description: true,
        body: true,
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
    return this.prisma.map.create({
      data: { ...dto, accountId },
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
    const result = await this.prisma.map.updateMany({
      where: { id, accountId },
      data: dto,
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
      select: { id: true },
    });
    if (!map) throw new NotFoundException('Map not found');

    await this.prisma.$transaction([
      this.prisma.mapComment.deleteMany({ where: { mapId: id } }),
      this.prisma.map.delete({ where: { id } }),
    ]);
    return { id };
  }

  async #assertPublished(id: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, isPublished: true },
      select: { id: true },
    });
    if (!map) throw new NotFoundException('Published map not found');
  }
}
