import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaMainService } from '@wm/api/database-main';
import { TexturePacksService } from './texture-packs.service';
import { TexturesService } from './textures.service';

describe('TexturePacksService', () => {
  const prisma = {
    texturePack: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    texture: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const textures = {
    upload: jest.fn(),
    validateFile: jest.fn(),
    remove: jest.fn(),
    removeFiles: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes values when creating a pack', async () => {
    prisma.texturePack.create.mockResolvedValue({ id: 'pack-id' });
    const service = await createService();

    await service.create(7, {
      name: '  Stone  ',
      description: '  Walls  ',
    });

    expect(prisma.texturePack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          accountId: 7,
          name: 'Stone',
          description: 'Walls',
        },
      }),
    );
  });

  it('rejects a whitespace-only pack name', async () => {
    const service = await createService();

    expect(() => service.create(7, { name: '   ' })).toThrow(
      BadRequestException,
    );
  });

  it('updates only a pack owned by the account and normalizes values', async () => {
    prisma.texturePack.findFirst.mockResolvedValue({ id: 'pack-id' });
    prisma.texturePack.update.mockResolvedValue({ id: 'pack-id' });
    const service = await createService();

    await service.update(7, 'pack-id', {
      name: '  Stone walls  ',
      description: '   ',
    });

    expect(prisma.texturePack.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pack-id' },
        data: {
          name: 'Stone walls',
          description: null,
        },
      }),
    );
  });

  it('does not upload into a pack owned by another account', async () => {
    prisma.texturePack.findFirst.mockResolvedValue(null);
    const service = await createService();

    await expect(
      service.upload(7, 'foreign-pack', [
        {
          originalname: 'stone.png',
          mimetype: 'image/png',
          size: 8,
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        },
      ]),
    ).rejects.toThrow(NotFoundException);
    expect(textures.upload).not.toHaveBeenCalled();
  });

  it('returns only the requested page of an owned pack', async () => {
    prisma.texturePack.findFirst.mockResolvedValue({ id: 'pack-id' });
    prisma.$transaction.mockResolvedValue([[{ id: 'texture-id' }], 49]);
    const service = await createService();

    await expect(
      service.listTextures(7, 'pack-id', { page: 2, pageSize: 24 }),
    ).resolves.toEqual({
      items: [{ id: 'texture-id' }],
      total: 49,
      page: 2,
      pageSize: 24,
    });
    expect(prisma.texture.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 24, take: 24 }),
    );
  });

  it('never includes drafts in the public catalog', async () => {
    prisma.texturePack.findMany.mockResolvedValue([]);
    const service = await createService();

    await service.listPublished();

    expect(prisma.texturePack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
      }),
    );
  });

  it('returns published pack details with public author data', async () => {
    prisma.texturePack.findFirst.mockResolvedValue({
      id: 'pack-id',
      name: 'Stone',
      owner: { userId: 11, nickname: 'Cartographer' },
    });
    const service = await createService();

    await expect(service.getPublished('pack-id')).resolves.toEqual({
      id: 'pack-id',
      name: 'Stone',
      author: { id: 11, nickname: 'Cartographer' },
    });
    expect(prisma.texturePack.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pack-id', isPublished: true },
      }),
    );
  });

  it('does not expose textures of an unpublished pack', async () => {
    prisma.texturePack.findFirst.mockResolvedValue(null);
    const service = await createService();

    await expect(
      service.listPublishedTextures('draft-pack', { page: 1, pageSize: 24 }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not publish an empty texture pack', async () => {
    prisma.texturePack.findFirst.mockResolvedValue({
      id: 'pack-id',
      _count: { textures: 0 },
    });
    const service = await createService();

    await expect(service.updatePublication(7, 'pack-id', true)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.texturePack.update).not.toHaveBeenCalled();
  });

  it('delegates texture removal with owner and pack identifiers', async () => {
    textures.remove.mockResolvedValue({ id: 'texture-id' });
    prisma.texture.count.mockResolvedValue(1);
    const service = await createService();

    await service.removeTexture(7, 'pack-id', 'texture-id');

    expect(textures.remove).toHaveBeenCalledWith(7, 'pack-id', 'texture-id');
  });

  it('deletes only an owned pack and removes its stored files', async () => {
    prisma.texturePack.findFirst.mockResolvedValue({ id: 'pack-id' });
    prisma.texture.findMany.mockResolvedValue([
      { objectKey: 'first.png' },
      { objectKey: 'second.webp' },
    ]);
    prisma.texturePack.delete.mockResolvedValue({ id: 'pack-id' });
    const service = await createService();

    await expect(service.remove(7, 'pack-id')).resolves.toEqual({
      id: 'pack-id',
    });
    expect(prisma.texturePack.delete).toHaveBeenCalledWith({
      where: { id: 'pack-id' },
    });
    expect(textures.removeFiles).toHaveBeenCalledWith([
      'first.png',
      'second.webp',
    ]);
  });

  it('does not delete a pack owned by another account', async () => {
    prisma.texturePack.findFirst.mockResolvedValue(null);
    const service = await createService();

    await expect(service.remove(7, 'foreign-pack')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.texturePack.delete).not.toHaveBeenCalled();
    expect(textures.removeFiles).not.toHaveBeenCalled();
  });

  async function createService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TexturePacksService,
        { provide: PrismaMainService, useValue: prisma },
        { provide: TexturesService, useValue: textures },
      ],
    }).compile();
    return moduleRef.get(TexturePacksService);
  }
});
