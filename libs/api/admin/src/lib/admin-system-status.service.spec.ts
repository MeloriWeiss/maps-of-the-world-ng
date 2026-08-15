import { ObjectStorage } from '@wm/api/shared';
import { PrismaMainService } from '@wm/api/database-main';
import { AdminSystemStatusService } from './admin-system-status.service';

describe('AdminSystemStatusService', () => {
  const queryRaw = jest.fn();
  const checkAvailability = jest.fn();
  const prisma = { $queryRaw: queryRaw };
  const storage = { checkAvailability };
  const service = new AdminSystemStatusService(
    prisma as unknown as PrismaMainService,
    storage as unknown as ObjectStorage,
  );

  beforeEach(() => jest.clearAllMocks());

  it('reports an available system when all resources respond', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    checkAvailability.mockResolvedValue(undefined);

    const result = await service.getStatus();

    expect(result.status).toBe('available');
    expect(result.resources.database.status).toBe('available');
    expect(result.resources.objectStorage.status).toBe('available');
    expect(result.checkedAt).toEqual(expect.any(String));
    expect(result.uptimeSeconds).toEqual(expect.any(Number));
  });

  it('reports a degraded system without throwing when storage is unavailable', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    checkAvailability.mockRejectedValue(new Error('Storage is unavailable'));

    const result = await service.getStatus();

    expect(result.status).toBe('degraded');
    expect(result.resources.database.status).toBe('available');
    expect(result.resources.objectStorage.status).toBe('unavailable');
  });
});
