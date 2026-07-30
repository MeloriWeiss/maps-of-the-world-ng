import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import {
  CreateTexturePackDto,
  TexturePageQueryDto,
  UpdateTexturePackDto,
} from './texture-pack.dto';
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

  async listMine(accountId: number) {
    const packs = await this.#prisma.texturePack.findMany({
      where: { accountId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { textures: true } },
        textures: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: textureSelect,
        },
      },
    });
    return packs.map(({ textures, ...pack }) => ({
      ...pack,
      previewTextures: textures,
    }));
  }

  async listPublished(authorUserId?: number) {
    if (authorUserId !== undefined && !Number.isInteger(authorUserId)) {
      throw new BadRequestException('Invalid author identifier');
    }
    const packs = await this.#prisma.texturePack.findMany({
      where: {
        isPublished: true,
        ...(authorUserId === undefined
          ? {}
          : { owner: { userId: authorUserId } }),
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            nickname: true,
            userId: true,
          },
        },
        _count: { select: { textures: true } },
        textures: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: textureSelect,
        },
      },
    });
    return packs.map(({ textures, owner, ...pack }) => ({
      ...pack,
      author: {
        id: owner.userId,
        nickname: owner.nickname,
      },
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
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { textures: true } },
      },
    });
    if (!pack) throw new NotFoundException('Texture pack not found');
    return pack;
  }

  async getPublished(id: string) {
    const pack = await this.#prisma.texturePack.findFirst({
      where: { id, isPublished: true },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { textures: true } },
        owner: {
          select: {
            nickname: true,
            userId: true,
          },
        },
      },
    });
    if (!pack) throw new NotFoundException('Published texture pack not found');

    const { owner, ...publishedPack } = pack;
    return {
      ...publishedPack,
      author: {
        id: owner.userId,
        nickname: owner.nickname,
      },
    };
  }

  async update(accountId: number, id: string, dto: UpdateTexturePackDto) {
    await this.#assertOwner(accountId, id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Texture pack name is required');
    }

    return this.#prisma.texturePack.update({
      where: { id },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(dto.description === undefined
          ? {}
          : { description: dto.description.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { textures: true } },
      },
    });
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

  async listPublishedTextures(packId: string, query: TexturePageQueryDto) {
    const pack = await this.#prisma.texturePack.findFirst({
      where: { id: packId, isPublished: true },
      select: { id: true },
    });
    if (!pack) throw new NotFoundException('Published texture pack not found');

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.#prisma.$transaction([
      this.#prisma.texture.findMany({
        where: { packId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: textureSelect,
      }),
      this.#prisma.texture.count({ where: { packId } }),
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
        isPublished: true,
        publishedAt: true,
      },
    });
  }

  async updatePublication(
    accountId: number,
    packId: string,
    isPublished: boolean,
  ) {
    const pack = await this.#prisma.texturePack.findFirst({
      where: { id: packId, accountId },
      select: {
        id: true,
        _count: { select: { textures: true } },
      },
    });
    if (!pack) throw new NotFoundException('Texture pack not found');
    if (isPublished && pack._count.textures === 0) {
      throw new BadRequestException(
        'An empty texture pack cannot be published',
      );
    }
    return this.#prisma.texturePack.update({
      where: { id: packId },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      select: {
        id: true,
        isPublished: true,
        publishedAt: true,
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

  async removeTexture(accountId: number, packId: string, textureId: string) {
    const result = await this.#textures.remove(accountId, packId, textureId);
    const texturesCount = await this.#prisma.texture.count({
      where: { packId, accountId },
    });
    if (texturesCount === 0) {
      await this.#prisma.texturePack.update({
        where: { id: packId },
        data: { isPublished: false, publishedAt: null },
      });
    }
    return result;
  }

  async remove(accountId: number, packId: string) {
    await this.#assertOwner(accountId, packId);
    const textures = await this.#prisma.texture.findMany({
      where: { packId, accountId },
      select: { objectKey: true },
    });

    await this.#prisma.texturePack.delete({ where: { id: packId } });
    await this.#textures.removeFiles(
      textures.map(({ objectKey }) => objectKey),
    );
    return { id: packId };
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
