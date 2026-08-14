import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMainService } from '@wm/api/database-main';
import {
  CreateForumCommentDto,
  CreateForumDiscussionDto,
  ListForumDiscussionsDto,
} from './forum.dto';

interface ForumCommentView {
  id: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
  };
  replies: ForumCommentView[];
}

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
    const search = query.search?.trim();
    const where = {
      isHidden: false,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
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
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
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
          avatarUrl: authorAccount.avatarUrl,
        },
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async discussion(id: number, accountId?: number) {
    const discussion = await this.prisma.forum.findFirst({
      where: { id, isHidden: false },
      select: {
        id: true,
        title: true,
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
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            comment: true,
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

    const { authorAccount, comments, _count, ...data } = discussion;
    return {
      ...data,
      isLiked: _count.likes > 0,
      author: {
        id: authorAccount.userId,
        nickname: authorAccount.nickname,
        avatarUrl: authorAccount.avatarUrl,
      },
      comments: this.#commentTree(comments),
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
    await this.#assertDiscussion(forumId);
    if (dto.parentId) {
      const parent = await this.prisma.forumComment.findFirst({
        where: { id: dto.parentId, forumId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    return this.prisma.$transaction(async (transaction) => {
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
        },
      });
      return comment;
    });
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
      select: { id: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');
  }

  #commentTree(
    comments: Array<{
      id: number;
      comment: string;
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
        text: comment.comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.authorAccount.userId,
          nickname: comment.authorAccount.nickname,
          avatarUrl: comment.authorAccount.avatarUrl,
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
