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
