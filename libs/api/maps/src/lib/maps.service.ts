import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { SaveMapDto } from './maps.dto';

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaMainService) {}

  create(accountId: number, dto: SaveMapDto) {
    return this.prisma.map.create({
      data: { ...dto, accountId },
      select: { id: true, name: true, description: true },
    });
  }

  async update(id: number, accountId: number, dto: SaveMapDto) {
    const result = await this.prisma.map.updateMany({
      where: { id, accountId },
      data: dto,
    });
    if (result.count === 0) throw new NotFoundException('Map not found');
    return { id, name: dto.name, description: dto.description };
  }

  async get(id: number, accountId: number) {
    const map = await this.prisma.map.findFirst({
      where: { id, accountId },
      select: { id: true, name: true, description: true, body: true },
    });
    if (!map) throw new NotFoundException('Map not found');
    return map;
  }

  list(accountId: number) {
    return this.prisma.map.findMany({
      where: { accountId },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, description: true },
      take: 50,
    });
  }
}
