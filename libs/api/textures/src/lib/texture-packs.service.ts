import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { CreateTexturePackDto, TexturePageQueryDto } from './texture-pack.dto';
import { UploadedTextureFile } from './texture-file.interface';
import { TexturesService } from './textures.service';

const textureSelect = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

@Injectable()
export class TexturePacksService {
  #prisma: PrismaMainService;
  #textures: TexturesService;

  constructor(
    @Inject(PrismaMainService) prisma: PrismaMainService,
    @Inject(TexturesService) textures: TexturesService,
  ) {
    this.#prisma = prisma;
    this.#textures = textures;
  }

  async list(accountId: number) {
    const packs = await this.#prisma.texturePack.findMany({
      where: { accountId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { textures: true } },
        textures: {
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: textureSelect,
        },
      },
    });
    return packs.map(({ textures, ...pack }) => ({
      ...pack,
      previewTextures: textures,
    }));
  }

  async get(accountId: number, id: string) {
    const pack = await this.#prisma.texturePack.findFirst({
      where: { id, accountId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!pack) throw new NotFoundException('Texture pack not found');
    return pack;
  }

  async listTextures(
    accountId: number,
    packId: string,
    query: TexturePageQueryDto,
  ) {
    await this.#assertOwner(accountId, packId);
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.#prisma.$transaction([
      this.#prisma.texture.findMany({
        where: { packId, accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: textureSelect,
      }),
      this.#prisma.texture.count({ where: { packId, accountId } }),
    ]);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  create(accountId: number, dto: CreateTexturePackDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Texture pack name is required');

    return this.#prisma.texturePack.create({
      data: {
        accountId,
        name,
        description: dto.description?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upload(
    accountId: number,
    packId: string,
    files: UploadedTextureFile[],
  ) {
    if (files.length === 0) {
      throw new BadRequestException('At least one texture file is required');
    }
    await this.#assertOwner(accountId, packId);
    for (const file of files) this.#textures.validateFile(file);

    const uploaded = [];
    for (const file of files) {
      uploaded.push(
        await this.#textures.upload(
          accountId,
          this.#nameFromFile(file.originalname),
          file,
          packId,
        ),
      );
    }
    return uploaded;
  }

  async #assertOwner(accountId: number, packId: string) {
    const pack = await this.#prisma.texturePack.findFirst({
      where: { id: packId, accountId },
      select: { id: true },
    });
    if (!pack) throw new NotFoundException('Texture pack not found');
  }

  #nameFromFile(fileName: string): string {
    const withoutExtension = fileName.replace(/\.[^.]+$/, '').trim();
    return (withoutExtension || 'Texture').slice(0, 120);
  }
}
