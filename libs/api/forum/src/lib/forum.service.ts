import type { ForumCommentView } from './interfaces/forum-comment-view';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PrismaMainService } from '@wm/api/database-main';
import { avatarPublicUrl } from '@wm/api/accounts';
import {
  CreateForumCommentDto,
  CreateForumDiscussionDto,
  ListForumDiscussionsDto,
  ForumCommentsQueryDto,
  EditForumCommentDto,
  ModerateForumDto,
} from './forum.dto';

/** Выполняет запросы к темам, комментариям и категориям форума. */
@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaMainService) {}

  async categories() {
    const categories = await this.prisma.forumCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        _count: {
          select: { discussions: { where: { isHidden: false } } },
        },
      },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      discussionsCount: _count.discussions,
    }));
  }

  async discussions(query: ListForumDiscussionsDto, accountId?: number) {
    if (query.scope === 'mine' && !accountId) throw new UnauthorizedException();
    const search = query.search?.trim();
    const where = {
      isHidden: false,
      ...(query.scope === 'mine' ? { authorId: accountId } : {}),
      ...(query.sort === 'unanswered' ? { commentsCount: 0 } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { post: { contains: search, mode: 'insensitive' as const } },
              {
                authorAccount: {
                  nickname: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.forum.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          query.sort === 'new'
            ? { createdAt: 'desc' }
            : { lastActivityAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
          isPinned: true,
          isClosed: true,
          lastActivityAt: true,
          createdAt: true,
          updatedAt: true,
          likesCount: true,
          commentsCount: true,
          category: { select: { slug: true, title: true } },
          authorAccount: {
            select: { userId: true, nickname: true, avatarUrl: true },
          },
          _count: {
            select: { likes: { where: { accountId: accountId ?? -1 } } },
          },
        },
      }),
      this.prisma.forum.count({ where }),
    ]);
    return {
      items: items.map(({ authorAccount, _count, ...discussion }) => ({
        ...discussion,
        isLiked: _count.likes > 0,
        author: {
          id: authorAccount.userId,
          nickname: authorAccount.nickname,
          avatarUrl: avatarPublicUrl(
            authorAccount.userId,
            authorAccount.avatarUrl,
          ),
        },
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async discussion(id: number, accountId?: number, includeComments = true) {
    const discussion = await this.prisma.forum.findFirst({
      where: { id, isHidden: false },
      select: {
        id: true,
        title: true,
        isPinned: true,
        isClosed: true,
        lastActivityAt: true,
        authorId: true,
        post: true,
        createdAt: true,
        updatedAt: true,
        likesCount: true,
        commentsCount: true,
        category: { select: { slug: true, title: true } },
        authorAccount: {
          select: { userId: true, nickname: true, avatarUrl: true },
        },
        comments: {
          ...(includeComments ? {} : { where: { id: -1 } }),
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            comment: true,
            isHidden: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            authorAccount: {
              select: { userId: true, nickname: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { likes: { where: { accountId: accountId ?? -1 } } },
        },
      },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const { authorAccount, authorId, comments, _count, ...data } = discussion;
    return {
      ...data,
      canEdit: authorId === accountId && !discussion.isClosed,
      isLiked: _count.likes > 0,
      author: {
        id: authorAccount.userId,
        nickname: authorAccount.nickname,
        avatarUrl: avatarPublicUrl(
          authorAccount.userId,
          authorAccount.avatarUrl,
        ),
      },
      comments: this.#commentTree(comments ?? []),
    };
  }

  async createDiscussion(accountId: number, dto: CreateForumDiscussionDto) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug: dto.category },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Forum category not found');

    return this.prisma.forum.create({
      data: {
        title: dto.title.trim(),
        post: dto.post.trim(),
        authorId: accountId,
        categoryId: category.id,
      },
      select: { id: true },
    });
  }

  async createComment(
    forumId: number,
    accountId: number,
    dto: CreateForumCommentDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.#lockOpenDiscussion(transaction, forumId);
      if (dto.parentId) {
        const parent = await transaction.forumComment.findFirst({
          where: { id: dto.parentId, forumId, isHidden: false },
          select: { id: true },
        });
        if (!parent) throw new NotFoundException('Parent comment not found');
      }
      const comment = await transaction.forumComment.create({
        data: {
          comment: dto.comment.trim(),
          forumId,
          authorId: accountId,
          parentId: dto.parentId,
        },
        select: { id: true },
      });
      await transaction.forum.update({
        where: { id: forumId },
        data: {
          commentsCount: { increment: 1 },
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });
      return comment;
    });
  }

  async editDiscussion(
    id: number,
    accountId: number,
    dto: CreateForumDiscussionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const discussion = await this.#lockOpenDiscussion(tx, id);
      if (discussion.authorId !== accountId) throw new ForbiddenException();
      const category = await tx.forumCategory.findUnique({
        where: { slug: dto.category },
      });
      if (!category) throw new NotFoundException('Forum category not found');
      return tx.forum.update({
        where: { id },
        data: {
          title: dto.title.trim(),
          post: dto.post.trim(),
          categoryId: category.id,
        },
        select: { id: true },
      });
    });
  }

  async comments(
    forumId: number,
    query: ForumCommentsQueryDto,
    accountId?: number,
  ) {
    const discussion = await this.#assertDiscussion(forumId);
    return this.prisma.$transaction(
      async (tx) => {
        let page = query.page;
        const tree = query.view === 'tree';
        const path: Array<{
          id: number;
          parentId: number | null;
          page: number;
        }> = [];
        const where: Prisma.ForumCommentWhereInput = {
          forumId,
          ...(tree ? { parentId: query.parentId ?? null } : {}),
        };
        if (tree && query.commentId) {
          const ancestors = await tx.$queryRaw<
            Array<{ id: number; parentId: number | null; page: number }>
          >`
            WITH RECURSIVE ancestors AS (
              SELECT id, parent_id FROM forum_comments
              WHERE id = ${query.commentId} AND forum_id = ${forumId}
              UNION
              SELECT c.id, c.parent_id FROM forum_comments c
              JOIN ancestors a ON c.id = a.parent_id
              WHERE c.forum_id = ${forumId}
            )
            SELECT a.id, a.parent_id AS "parentId",
              (SELECT (count(*) / ${query.pageSize})::int + 1
               FROM forum_comments c WHERE c.forum_id = ${forumId}
               AND c.parent_id IS NOT DISTINCT FROM a.parent_id AND c.id < a.id) AS page
            FROM ancestors a
          `;
          const byId = new Map(ancestors.map((item) => [item.id, item]));
          let current = byId.get(query.commentId);
          if (!current) throw new NotFoundException('Comment not found');
          const visited = new Set<number>();
          while (current && !visited.has(current.id)) {
            visited.add(current.id);
            path.push(current);
            current = current.parentId ? byId.get(current.parentId) : undefined;
          }
          path.reverse();
          page = path[0].page;
          where.parentId = null;
        } else if (query.commentId) {
          const target = await tx.forumComment.findFirst({
            where: { id: query.commentId, forumId },
          });
          if (!target) throw new NotFoundException('Comment not found');
          const preceding = await tx.forumComment.count({
            where: { forumId, id: { lt: target.id } },
          });
          page = Math.floor(preceding / query.pageSize) + 1;
        }
        if (tree && query.parentId && !query.commentId) {
          const parent = await tx.forumComment.findFirst({
            where: { id: query.parentId, forumId },
            select: { id: true },
          });
          if (!parent) throw new NotFoundException('Parent comment not found');
        }
        const total = await tx.forumComment.count({ where });
        const items = await tx.forumComment.findMany({
          where,
          orderBy: { id: 'asc' },
          skip: (page - 1) * query.pageSize,
          take: query.pageSize,
          include: {
            _count: { select: { replies: true } },
            authorAccount: {
              select: { userId: true, nickname: true, avatarUrl: true },
            },
            parent: {
              select: {
                id: true,
                isHidden: true,
                authorAccount: { select: { nickname: true } },
              },
            },
          },
        });
        return {
          page,
          pageSize: query.pageSize,
          total,
          ...(tree ? { path } : {}),
          items: items.map((item) => ({
            id: item.id,
            repliesCount: item._count.replies,
            text: item.isHidden ? '' : item.comment,
            isHidden: item.isHidden,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            canEdit:
              item.authorId === accountId &&
              !item.isHidden &&
              !discussion.isClosed,
            author: {
              id: item.authorAccount.userId,
              nickname: item.authorAccount.nickname,
              avatarUrl: avatarPublicUrl(
                item.authorAccount.userId,
                item.authorAccount.avatarUrl,
              ),
            },
            parent: item.parent
              ? {
                  id: item.parent.id,
                  nickname: item.parent.isHidden
                    ? 'Скрытое сообщение'
                    : item.parent.authorAccount.nickname,
                }
              : null,
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async editComment(
    forumId: number,
    id: number,
    accountId: number,
    dto: EditForumCommentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.#lockOpenDiscussion(tx, forumId);
      const item = await tx.forumComment.findFirst({
        where: { id, forumId, isHidden: false },
      });
      if (!item) throw new NotFoundException('Comment not found');
      if (item.authorId !== accountId) throw new ForbiddenException();
      return tx.forumComment.update({
        where: { id },
        data: { comment: dto.comment.trim() },
        select: { id: true },
      });
    });
  }

  async moderateDiscussion(id: number, actorId: number, dto: ModerateForumDto) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.forum.findUnique({ where: { id } });
      if (!item) throw new NotFoundException();
      const data = {
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.isClosed !== undefined ? { isClosed: dto.isClosed } : {}),
      };
      const updated = await tx.forum.update({
        where: { id },
        data,
        select: { id: true, isPinned: true, isClosed: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'forum.moderate',
          targetType: 'forum',
          targetId: String(id),
          details: {
            ...data,
            previousIsPinned: item.isPinned,
            previousIsClosed: item.isClosed,
          },
        },
      });
      return updated;
    });
  }

  async moderateComment(
    forumId: number,
    id: number,
    actorId: number,
    isHidden: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.forumComment.findFirst({ where: { id, forumId } });
      if (!item) throw new NotFoundException();
      const result = await tx.forumComment.update({
        where: { id },
        data: { isHidden },
        select: { id: true, isHidden: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: isHidden ? 'forum.comment.hide' : 'forum.comment.restore',
          targetType: 'forum-comment',
          targetId: String(id),
          details: { forumId },
        },
      });
      return result;
    });
  }

  async #lockOpenDiscussion(tx: Prisma.TransactionClient, id: number) {
    // Serialize publishing/editing with closing or hiding the topic.
    await tx.$queryRaw`SELECT id FROM forums WHERE id = ${id} FOR UPDATE`;
    const item = await tx.forum.findFirst({ where: { id, isHidden: false } });
    if (!item) throw new NotFoundException('Discussion not found');
    if (item.isClosed) throw new ForbiddenException('Discussion is closed');
    return item;
  }

  async like(forumId: number, accountId: number) {
    await this.#assertDiscussion(forumId);
    const result = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.forumLike.createMany({
        data: { forumId, accountId },
        skipDuplicates: true,
      });
      if (created.count > 0) {
        await transaction.forum.update({
          where: { id: forumId },
          data: { likesCount: { increment: 1 } },
        });
      }
      return transaction.forum.findUniqueOrThrow({
        where: { id: forumId },
        select: { likesCount: true },
      });
    });
    return { isLiked: true, likesCount: result.likesCount };
  }

  async unlike(forumId: number, accountId: number) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const removed = await transaction.forumLike.deleteMany({
        where: { forumId, accountId },
      });
      if (removed.count > 0) {
        await transaction.forum.updateMany({
          where: { id: forumId, likesCount: { gt: 0 } },
          data: { likesCount: { decrement: 1 } },
        });
      }
      return transaction.forum.findUnique({
        where: { id: forumId },
        select: { likesCount: true },
      });
    });
    if (!result) throw new NotFoundException('Discussion not found');
    return { isLiked: false, likesCount: result.likesCount };
  }

  async #assertDiscussion(id: number) {
    const discussion = await this.prisma.forum.findFirst({
      where: { id, isHidden: false },
      select: { id: true, isClosed: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');
    return discussion;
  }

  #commentTree(
    comments: Array<{
      id: number;
      comment: string;
      isHidden?: boolean;
      parentId: number | null;
      createdAt: Date;
      updatedAt: Date;
      authorAccount: {
        userId: number;
        nickname: string;
        avatarUrl: string | null;
      };
    }>,
  ) {
    const views = new Map<number, ForumCommentView>();
    for (const comment of comments) {
      views.set(comment.id, {
        id: comment.id,
        text: comment.isHidden
          ? 'Сообщение скрыто модератором.'
          : comment.comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.authorAccount.userId,
          nickname: comment.authorAccount.nickname,
          avatarUrl: avatarPublicUrl(
            comment.authorAccount.userId,
            comment.authorAccount.avatarUrl,
          ),
        },
        replies: [],
      });
    }
    const roots: ForumCommentView[] = [];
    for (const comment of comments) {
      const view = views.get(comment.id);
      if (!view) continue;
      const parent = comment.parentId ? views.get(comment.parentId) : undefined;
      if (parent) parent.replies.push(view);
      else roots.push(view);
    }
    return roots;
  }
}
