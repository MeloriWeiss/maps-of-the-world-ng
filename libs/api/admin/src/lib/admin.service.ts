import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import { UserRole, UserRoleType, UserStatusType } from '@wm/shared/users';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { Prisma } from '@wm/api/database-main';
import {
  AnalyticsInterval,
  UserAnalyticsQueryDto,
} from './dto/user-analytics-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaMainService) {}

  async getDashboard() {
    const [users, blockedUsers, maps, texturePacks, discussions, comments] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'BLOCKED' } }),
        this.prisma.map.count(),
        this.prisma.texturePack.count(),
        this.prisma.forum.count(),
        this.prisma.forumComment.count(),
      ]);

    return {
      users,
      blockedUsers,
      maps,
      texturePacks,
      discussions,
      comments,
    };
  }

  recordSiteVisit(sessionId: string, visitorId: string) {
    return this.prisma.siteVisit.upsert({
      where: { sessionId },
      create: { sessionId, visitorId },
      update: { visitorId },
    });
  }

  async getUserAnalytics(query: UserAnalyticsQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (from >= to)
      throw new BadRequestException('Дата from должна быть раньше to');
    const effectiveInterval = this.#resolveAnalyticsInterval(
      from,
      to,
      query.interval,
    );
    const interval = this.#intervalSql(effectiveInterval);
    const [totalUsers, registered, trafficSummary, series] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
      this.prisma.$queryRaw<{ visits: bigint; uniqueVisitors: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*) AS visits,
                 COUNT(DISTINCT "visitor_id") AS "uniqueVisitors"
          FROM "site_visits"
          WHERE "created_at" >= ${from} AND "created_at" < ${to}
        `,
      ),
      this.prisma.$queryRaw<
        {
          bucket: Date;
          registrations: bigint;
          visits: bigint;
          uniqueVisitors: bigint;
        }[]
      >(Prisma.sql`
        WITH buckets AS (
          SELECT generate_series(
            date_trunc(${effectiveInterval}, ${from}::timestamp),
            date_trunc(${effectiveInterval}, (${to}::timestamp - interval '1 millisecond')),
            ${interval}
          ) AS bucket
        ), registrations AS (
          SELECT date_trunc(${effectiveInterval}, "created_at") AS bucket,
                 COUNT(*) AS value
          FROM "users"
          WHERE "created_at" >= ${from} AND "created_at" < ${to}
          GROUP BY 1
        ), visits AS (
          SELECT date_trunc(${effectiveInterval}, "created_at") AS bucket,
                 COUNT(*) AS value,
                 COUNT(DISTINCT "visitor_id") AS unique_visitors
          FROM "site_visits"
          WHERE "created_at" >= ${from} AND "created_at" < ${to}
          GROUP BY 1
        )
        SELECT buckets.bucket,
               COALESCE(registrations.value, 0) AS registrations,
               COALESCE(visits.value, 0) AS visits,
               COALESCE(visits.unique_visitors, 0) AS "uniqueVisitors"
        FROM buckets
        LEFT JOIN registrations USING (bucket)
        LEFT JOIN visits USING (bucket)
        ORDER BY buckets.bucket
      `),
    ]);

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        interval: effectiveInterval,
      },
      summary: {
        totalUsers,
        registered,
        visits: Number(trafficSummary[0]?.visits ?? 0),
        uniqueVisitors: Number(trafficSummary[0]?.uniqueVisitors ?? 0),
      },
      series: series.map((item) => ({
        from: item.bucket.toISOString(),
        registrations: Number(item.registrations),
        visits: Number(item.visits),
        uniqueVisitors: Number(item.uniqueVisitors),
      })),
    };
  }

  #intervalSql(interval: AnalyticsInterval) {
    const values: Record<AnalyticsInterval, Prisma.Sql> = {
      hour: Prisma.sql`interval '1 hour'`,
      day: Prisma.sql`interval '1 day'`,
      week: Prisma.sql`interval '1 week'`,
      month: Prisma.sql`interval '1 month'`,
      year: Prisma.sql`interval '1 year'`,
    };
    return values[interval];
  }

  #resolveAnalyticsInterval(
    from: Date,
    to: Date,
    requestedInterval: AnalyticsInterval,
  ): AnalyticsInterval {
    const maxPoints = 400;
    const intervalDurations: ReadonlyArray<{
      interval: AnalyticsInterval;
      milliseconds: number;
    }> = [
      { interval: 'hour', milliseconds: 60 * 60 * 1000 },
      { interval: 'day', milliseconds: 24 * 60 * 60 * 1000 },
      { interval: 'week', milliseconds: 7 * 24 * 60 * 60 * 1000 },
      { interval: 'month', milliseconds: 30.44 * 24 * 60 * 60 * 1000 },
      { interval: 'year', milliseconds: 365.25 * 24 * 60 * 60 * 1000 },
    ];
    const requestedIndex = intervalDurations.findIndex(
      ({ interval }) => interval === requestedInterval,
    );
    const periodDuration = to.getTime() - from.getTime();

    return (
      intervalDurations
        .slice(requestedIndex)
        .find(({ milliseconds }) => periodDuration / milliseconds <= maxPoints)
        ?.interval ?? 'year'
    );
  }

  async getUsers(query: AdminUsersQueryDto) {
    const search = query.search?.trim();
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getMaps(query: AdminListQueryDto) {
    const search = query.search?.trim();
    const author = query.author?.trim();
    const where: Prisma.MapWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(author && {
        authorAccount: {
          is: { nickname: { contains: author, mode: 'insensitive' } },
        },
      }),
      ...(query.visibility && {
        isHidden: query.visibility === 'hidden',
      }),
      ...(query.publication && {
        isPublished: query.publication === 'published',
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.map.findMany({
        where,
        select: {
          id: true,
          name: true,
          isPublished: true,
          isHidden: true,
          likesCount: true,
          commentsCount: true,
          authorAccount: { select: { nickname: true, userId: true } },
        },
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.map.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getTexturePacks(query: AdminListQueryDto) {
    const search = query.search?.trim();
    const author = query.author?.trim();
    const where: Prisma.TexturePackWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(author && {
        owner: {
          is: { nickname: { contains: author, mode: 'insensitive' } },
        },
      }),
      ...(query.visibility && {
        isHidden: query.visibility === 'hidden',
      }),
      ...(query.publication && {
        isPublished: query.publication === 'published',
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.texturePack.findMany({
        where,
        select: {
          id: true,
          name: true,
          isPublished: true,
          isHidden: true,
          likesCount: true,
          updatedAt: true,
          owner: { select: { nickname: true, userId: true } },
          _count: { select: { textures: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.texturePack.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getDiscussions(query: AdminListQueryDto) {
    const search = query.search?.trim();
    const author = query.author?.trim();
    const category = query.category?.trim();
    const where: Prisma.ForumWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(author && {
        authorAccount: {
          is: { nickname: { contains: author, mode: 'insensitive' } },
        },
      }),
      ...(category && {
        category: {
          is: { title: { contains: category, mode: 'insensitive' } },
        },
      }),
      ...(query.visibility && {
        isHidden: query.visibility === 'hidden',
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.forum.findMany({
        where,
        select: {
          id: true,
          title: true,
          isHidden: true,
          likesCount: true,
          commentsCount: true,
          updatedAt: true,
          authorAccount: { select: { nickname: true, userId: true } },
          category: { select: { title: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.forum.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getAudit(query: AdminAuditQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from >= to)
      throw new BadRequestException('Дата from должна быть раньше to');

    const actor = query.actor?.trim();
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.action && { action: query.action }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.targetId?.trim() && { targetId: query.targetId.trim() }),
      ...((from || to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lt: to }) },
      }),
      ...(actor && {
        actor: {
          is: {
            OR: [
              { username: { contains: actor, mode: 'insensitive' } },
              { email: { contains: actor, mode: 'insensitive' } },
              {
                personalAccount: {
                  is: { nickname: { contains: actor, mode: 'insensitive' } },
                },
              },
            ],
          },
        },
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          details: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
              personalAccount: { select: { nickname: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    const targetNames = await this.#getAuditTargetNames(items);
    return {
      items: items.map((item) => ({
        ...item,
        targetName:
          targetNames.get(`${item.targetType}:${item.targetId}`) ?? null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async #getAuditTargetNames(
    items: ReadonlyArray<{ targetType: string; targetId: string }>,
  ) {
    const targetNames = new Map<string, string>();
    if (items.length === 0) return targetNames;

    const numericIds = (targetType: string) =>
      items
        .filter((item) => item.targetType === targetType)
        .map((item) => Number(item.targetId))
        .filter((id) => Number.isInteger(id));
    const texturePackIds = items
      .filter((item) => item.targetType === 'TEXTURE_PACK')
      .map((item) => item.targetId);

    const [users, maps, texturePacks, discussions] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: numericIds('USER') } },
        select: {
          id: true,
          username: true,
          personalAccount: { select: { nickname: true } },
        },
      }),
      this.prisma.map.findMany({
        where: { id: { in: numericIds('MAP') } },
        select: { id: true, name: true },
      }),
      this.prisma.texturePack.findMany({
        where: { id: { in: texturePackIds } },
        select: { id: true, name: true },
      }),
      this.prisma.forum.findMany({
        where: { id: { in: numericIds('FORUM_DISCUSSION') } },
        select: { id: true, title: true },
      }),
    ]);

    users.forEach((user) =>
      targetNames.set(
        `USER:${user.id}`,
        user.personalAccount?.nickname ?? user.username,
      ),
    );
    maps.forEach((map) => targetNames.set(`MAP:${map.id}`, map.name));
    texturePacks.forEach((texturePack) =>
      targetNames.set(`TEXTURE_PACK:${texturePack.id}`, texturePack.name),
    );
    discussions.forEach((discussion) =>
      targetNames.set(`FORUM_DISCUSSION:${discussion.id}`, discussion.title),
    );
    return targetNames;
  }

  updateMapVisibility(actorId: number, id: number, isHidden: boolean) {
    return this.#updateVisibility(actorId, 'MAP', String(id), isHidden);
  }

  updateTexturePackVisibility(actorId: number, id: string, isHidden: boolean) {
    return this.#updateVisibility(actorId, 'TEXTURE_PACK', id, isHidden);
  }

  updateDiscussionVisibility(actorId: number, id: number, isHidden: boolean) {
    return this.#updateVisibility(
      actorId,
      'FORUM_DISCUSSION',
      String(id),
      isHidden,
    );
  }

  async updateRole(actorId: number, targetId: number, role: UserRoleType) {
    if (actorId === targetId)
      throw new BadRequestException('Нельзя изменить собственную роль');

    const target = await this.#getUser(targetId);

    if (target.role === UserRole.superAdmin)
      throw new ForbiddenException('Роль супер-администратора неизменяема');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetId },
        data: { role },
        select: { id: true, role: true, status: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'USER_ROLE_CHANGED',
          targetType: 'USER',
          targetId: String(targetId),
          details: { previousRole: target.role, role },
        },
      });
      return updated;
    });
  }

  async updateStatus(
    actorId: number,
    actorRole: UserRoleType,
    targetId: number,
    status: UserStatusType,
  ) {
    if (actorId === targetId)
      throw new BadRequestException('Нельзя заблокировать собственный аккаунт');

    const target = await this.#getUser(targetId);

    if (target.role === UserRole.superAdmin)
      throw new ForbiddenException('Супер-администратора нельзя блокировать');
    if (target.role === UserRole.admin && actorRole !== UserRole.superAdmin)
      throw new ForbiddenException(
        'Администратора может блокировать только супер-администратор',
      );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetId },
        data: { status },
        select: { id: true, role: true, status: true },
      });
      if (status === 'BLOCKED')
        await tx.userSession.deleteMany({ where: { userId: targetId } });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'USER_STATUS_CHANGED',
          targetType: 'USER',
          targetId: String(targetId),
          details: { previousStatus: target.status, status },
        },
      });
      return updated;
    });
  }

  async #getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async #updateVisibility(
    actorId: number,
    targetType: 'MAP' | 'TEXTURE_PACK' | 'FORUM_DISCUSSION',
    targetId: string,
    isHidden: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let previousIsHidden: boolean;
      if (targetType === 'MAP') {
        const item = await tx.map.findUnique({
          where: { id: Number(targetId) },
          select: { isHidden: true },
        });
        if (!item) throw new NotFoundException('Карта не найдена');
        previousIsHidden = item.isHidden;
        await tx.map.update({
          where: { id: Number(targetId) },
          data: { isHidden },
        });
      } else if (targetType === 'TEXTURE_PACK') {
        const item = await tx.texturePack.findUnique({
          where: { id: targetId },
          select: { isHidden: true },
        });
        if (!item) throw new NotFoundException('Набор текстур не найден');
        previousIsHidden = item.isHidden;
        await tx.texturePack.update({
          where: { id: targetId },
          data: { isHidden },
        });
      } else {
        const item = await tx.forum.findUnique({
          where: { id: Number(targetId) },
          select: { isHidden: true },
        });
        if (!item) throw new NotFoundException('Тема форума не найдена');
        previousIsHidden = item.isHidden;
        await tx.forum.update({
          where: { id: Number(targetId) },
          data: { isHidden },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'CONTENT_VISIBILITY_CHANGED',
          targetType,
          targetId,
          details: { previousIsHidden, isHidden },
        },
      });
      return { id: targetId, isHidden };
    });
  }
}
