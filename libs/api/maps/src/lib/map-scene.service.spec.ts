import { Test } from '@nestjs/testing';
import { PrismaMainService } from '@wm/api/database-main';
import { OBJECT_STORAGE } from '@wm/api/shared';
import { MapSceneService, sceneChunkKeys } from './map-scene.service';
import { seedMapScene } from '../../../../database-main/src/lib/prisma/seed/map-scene';

describe('Chunk scenes', () => {
  it('the seed emits a valid scene manifest with actual chunk data and a root', () => {
    const fixture = seedMapScene(2);
    expect(sceneChunkKeys(fixture.body)).toEqual(['0:0']);
    const records = JSON.parse(fixture.chunk.body);
    const manifest = JSON.parse(fixture.body);
    expect(manifest.nodes.children).toHaveLength(0);
    expect(records[0].shape.type).toBe('text');
    expect(records[0].node.shapeId).toBe(records[0].shape.id);
    expect(records[0].parentId).toBe(manifest.nodes.id);
  });

  it('rejects duplicate chunk keys and invalid coordinates', () => {
    const fixture = JSON.parse(seedMapScene(0).body);
    fixture.chunks.push(fixture.chunks[0]);
    expect(() => sceneChunkKeys(JSON.stringify(fixture))).toThrow(
      'Invalid chunks',
    );
    fixture.chunks = [
      { key: '0:0', bounds: { x: null, y: 0, width: 1, height: 1 } },
    ];
    expect(() => sceneChunkKeys(JSON.stringify(fixture))).toThrow(
      'Invalid bounds',
    );
  });

  async function setup() {
    const tx = {
      map: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      mapChunk: {
        findMany: jest.fn().mockResolvedValue([{ key: '0:0' }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const prisma = {
      map: { findFirst: jest.fn().mockResolvedValue({ id: 1, revision: 3 }) },
      mapChunk: { findFirst: jest.fn().mockResolvedValue({ body: '[]' }) },
      $transaction: jest.fn(
        async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
      ),
    };
    const storage = { put: jest.fn(), get: jest.fn(), delete: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        MapSceneService,
        { provide: PrismaMainService, useValue: prisma },
        { provide: OBJECT_STORAGE, useValue: storage },
      ],
    }).compile();
    return { service: module.get(MapSceneService), prisma, tx, storage };
  }

  it('denies reading a chunk if the map is neither owned nor publicly visible', async () => {
    const { service, prisma } = await setup();
    prisma.map.findFirst.mockResolvedValueOnce(null);
    await expect(service.chunk(1, '0:0', 3, 7)).rejects.toThrow(
      'Map not found',
    );
    expect(prisma.mapChunk.findFirst).not.toHaveBeenCalled();
    expect(prisma.map.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
          OR: [{ accountId: 7 }, { isPublished: true, isHidden: false }],
        },
      }),
    );
  });

  it('rejects a stale revision before writing chunks', async () => {
    const { service, tx } = await setup();
    tx.map.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.save(1, 7, {
        revision: 2,
        manifest: seedMapScene(0).body,
        chunks: [],
      }),
    ).rejects.toThrow('Map changed');
    expect(tx.mapChunk.upsert).not.toHaveBeenCalled();
  });

  it('preserves omitted unchanged chunks and updates only supplied chunks', async () => {
    const { service, tx } = await setup();
    await expect(
      service.save(1, 7, {
        revision: 3,
        manifest: seedMapScene(0).body,
        chunks: [],
      }),
    ).resolves.toEqual({ revision: 4 });
    expect(tx.mapChunk.upsert).not.toHaveBeenCalled();
    expect(tx.mapChunk.deleteMany).toHaveBeenCalledWith({
      where: { mapId: 1, key: { notIn: ['0:0'] } },
    });
  });

  it('does not create a manifest referencing missing chunks', async () => {
    const { service, tx } = await setup();
    tx.mapChunk.findMany.mockResolvedValueOnce([]);
    await expect(
      service.save(1, 7, {
        revision: 3,
        manifest: seedMapScene(0).body,
        chunks: [],
      }),
    ).rejects.toThrow('Missing chunk data');
  });
});
