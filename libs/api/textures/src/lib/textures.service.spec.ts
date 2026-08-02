import { Test } from '@nestjs/testing';
import { PrismaMainService } from '@wm/api/database-main';
import { FakeObjectStorage } from '../testing/fake-object-storage';
import { OBJECT_STORAGE } from '@wm/api/api-shared';
import { TexturesService } from './textures.service';

describe('TexturesService', () => {
  it('removes the uploaded object when metadata persistence fails', async () => {
    const storage = new FakeObjectStorage();
    const prisma = {
      texture: {
        create: jest.fn().mockRejectedValue(new Error('Database unavailable')),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TexturesService,
        { provide: PrismaMainService, useValue: prisma },
        { provide: OBJECT_STORAGE, useValue: storage },
      ],
    }).compile();
    const service = moduleRef.get(TexturesService);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    await expect(
      service.upload(
        1,
        'texture',
        {
          originalname: 'texture.png',
          mimetype: 'image/png',
          size: png.length,
          buffer: png,
        },
        'pack-id',
      ),
    ).rejects.toThrow('Database unavailable');

    expect(storage.objects.size).toBe(0);
  });

  it('deletes only an owned texture from its pack and object storage', async () => {
    const storage = new FakeObjectStorage();
    storage.objects.set('texture-key', Buffer.from('texture'));
    const prisma = {
      texture: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'texture-id',
          objectKey: 'texture-key',
        }),
        delete: jest.fn().mockResolvedValue({ id: 'texture-id' }),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TexturesService,
        { provide: PrismaMainService, useValue: prisma },
        { provide: OBJECT_STORAGE, useValue: storage },
      ],
    }).compile();
    const service = moduleRef.get(TexturesService);

    await expect(service.remove(7, 'pack-id', 'texture-id')).resolves.toEqual({
      id: 'texture-id',
    });
    expect(prisma.texture.findFirst).toHaveBeenCalledWith({
      where: { id: 'texture-id', packId: 'pack-id', accountId: 7 },
      select: { id: true, objectKey: true },
    });
    expect(storage.objects.has('texture-key')).toBe(false);
  });
});
