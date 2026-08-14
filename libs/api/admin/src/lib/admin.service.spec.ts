import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { UserRole, UserStatus } from '@wm/shared/users';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const findUser = jest.fn();
  const countUsers = jest.fn();
  const upsertSiteVisit = jest.fn();
  const queryRaw = jest.fn();
  const findAudit = jest.fn();
  const countAudit = jest.fn();
  const findMaps = jest.fn();
  const countMaps = jest.fn();
  const transaction = jest.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const prisma = {
    user: { findUnique: findUser, count: countUsers },
    siteVisit: { upsert: upsertSiteVisit },
    adminAuditLog: { findMany: findAudit, count: countAudit },
    map: { findMany: findMaps, count: countMaps },
    $queryRaw: queryRaw,
    $transaction: transaction,
  };
  const service = new AdminService(prisma as unknown as PrismaMainService);

  beforeEach(() => jest.clearAllMocks());

  it('does not allow an administrator to change their own role', async () => {
    await expect(
      service.updateRole(7, 7, UserRole.user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findUser).not.toHaveBeenCalled();
  });

  it('does not allow blocking a super administrator', async () => {
    findUser.mockResolvedValue({
      id: 9,
      role: UserRole.superAdmin,
      status: UserStatus.active,
    });

    await expect(
      service.updateStatus(7, UserRole.superAdmin, 9, UserStatus.blocked),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow an administrator to block another administrator', async () => {
    findUser.mockResolvedValue({
      id: 9,
      role: UserRole.admin,
      status: UserStatus.active,
    });

    await expect(
      service.updateStatus(7, UserRole.admin, 9, UserStatus.blocked),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records a site visit idempotently by session id', async () => {
    const sessionId = '6dcdd34f-4654-4f65-a4d8-e3871d35aa3e';
    const visitorId = 'd588c90c-99c8-41f9-bdb7-e23062022f30';

    await service.recordSiteVisit(sessionId, visitorId);

    expect(upsertSiteVisit).toHaveBeenCalledWith({
      where: { sessionId },
      create: { sessionId, visitorId },
      update: { visitorId },
    });
  });

  it('rejects an analytics range where from is not before to', async () => {
    await expect(
      service.getUserAnalytics({
        from: '2026-08-13T10:00:00.000Z',
        to: '2026-08-13T10:00:00.000Z',
        interval: 'day',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts unique visitors from site visits rather than users', async () => {
    countUsers.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    queryRaw
      .mockResolvedValueOnce([{ visits: 3n, uniqueVisitors: 1n }])
      .mockResolvedValueOnce([]);

    await service.getUserAnalytics({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-14T00:00:00.000Z',
      interval: 'day',
    });

    const seriesQuery = queryRaw.mock.calls[1]?.[0];
    const sql = seriesQuery.strings.join(' ');
    const registrationsCte = sql.slice(
      sql.indexOf('registrations AS'),
      sql.indexOf('visits AS'),
    );
    const visitsCte = sql.slice(
      sql.indexOf('visits AS'),
      sql.indexOf('SELECT buckets.bucket'),
    );

    expect(registrationsCte).not.toContain('visitor_id');
    expect(visitsCte).toContain('COUNT(DISTINCT "visitor_id")');
  });

  it('uses a coarser interval for a long analytics period', async () => {
    countUsers.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    queryRaw
      .mockResolvedValueOnce([{ visits: 3n, uniqueVisitors: 1n }])
      .mockResolvedValueOnce([]);

    const result = await service.getUserAnalytics({
      from: '2021-08-14T00:00:00.000Z',
      to: '2026-08-14T00:00:00.000Z',
      interval: 'hour',
    });

    expect(result.period.interval).toBe('week');
  });

  it('filters audit records by actor, target and period', async () => {
    findAudit.mockResolvedValue([]);
    countAudit.mockResolvedValue(0);

    await service.getAudit({
      actor: 'moderator',
      action: 'CONTENT_VISIBILITY_CHANGED',
      targetType: 'MAP',
      targetId: '42',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-15T00:00:00.000Z',
      page: 1,
      pageSize: 20,
    });

    expect(findAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'CONTENT_VISIBILITY_CHANGED',
          targetType: 'MAP',
          targetId: '42',
          createdAt: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-08-15T00:00:00.000Z'),
          },
          actor: expect.any(Object),
        }),
      }),
    );
  });

  it('rejects an invalid audit date range', async () => {
    await expect(
      service.getAudit({
        from: '2026-08-15T00:00:00.000Z',
        to: '2026-08-14T00:00:00.000Z',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findAudit).not.toHaveBeenCalled();
  });

  it('filters moderated maps by common and publication filters', async () => {
    findMaps.mockResolvedValue([]);
    countMaps.mockResolvedValue(0);

    await service.getMaps({
      search: 'castle',
      author: 'artist',
      visibility: 'hidden',
      publication: 'published',
      page: 1,
      pageSize: 20,
    });

    expect(findMaps).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'castle', mode: 'insensitive' },
          authorAccount: expect.any(Object),
          isHidden: true,
          isPublished: true,
        }),
      }),
    );
  });
});
