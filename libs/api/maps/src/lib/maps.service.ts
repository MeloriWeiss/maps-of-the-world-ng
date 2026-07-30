import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { SaveMapDto } from './maps.dto';

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaMainService) {}

  listCatalog() {
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
        },
      })
      .then((maps) =>
        maps.map(({ authorAccount, ...map }) => ({
          ...map,
          author: {
            id: authorAccount.userId,
            nickname: authorAccount.nickname,
          },
        })),
      );
  }

  async getPublished(id: number) {
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
      },
    });
    if (!map) throw new NotFoundException('Published map not found');

    const { authorAccount, ...publishedMap } = map;
    return {
      ...publishedMap,
      author: {
        id: authorAccount.userId,
        nickname: authorAccount.nickname,
      },
    };
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

  async get(id: number, accountId: number) {
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

  list(accountId: number) {
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

  listPublished(authorUserId: number) {
    return this.prisma.map.findMany({
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
      },
    });
  }

  async updatePublication(id: number, accountId: number, isPublished: boolean) {
    const result = await this.prisma.map.updateMany({
      where: { id, accountId },
      data: { isPublished },
    });
    if (result.count === 0) throw new NotFoundException('Map not found');
    return { id, isPublished };
  }

  async remove(id: number, accountId: number) {
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
}
