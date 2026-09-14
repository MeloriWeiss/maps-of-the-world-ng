import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaMainService } from '@wm/api/database-main';
import { ForumService } from './forum.service';

describe('ForumService', () => {
  const findCategories = jest.fn();
  const findCategory = jest.fn();
  const findDiscussion = jest.fn();
  const createDiscussion = jest.fn();
  let service: ForumService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ForumService,
        {
          provide: PrismaMainService,
          useValue: {
            forumCategory: {
              findMany: findCategories,
              findUnique: findCategory,
            },
            forum: {
              findFirst: findDiscussion,
              create: createDiscussion,
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(ForumService);
  });

  it('returns category discussion counts in the public contract', async () => {
    findCategories.mockResolvedValue([
      {
        id: 1,
        slug: 'maps',
        title: 'Карты',
        description: null,
        _count: { discussions: 3 },
      },
    ]);

    await expect(service.categories()).resolves.toEqual([
      {
        id: 1,
        slug: 'maps',
        title: 'Карты',
        description: null,
        discussionsCount: 3,
      },
    ]);
  });

  it('rejects a missing discussion', async () => {
    findDiscussion.mockResolvedValue(null);

    await expect(service.discussion(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns public avatar URLs for the topic and legacy comment tree', async () => {
    const authorAccount = {
      userId: 7,
      nickname: 'Author',
      avatarUrl: 'avatars/3/photo.png',
    };
    findDiscussion.mockResolvedValue({
      id: 1,
      authorId: 3,
      authorAccount,
      _count: { likes: 0 },
      comments: [{ id: 2, comment: 'Reply', parentId: null, authorAccount }],
    });

    const result = await service.discussion(1);
    const url = '/api/accounts/profiles/7/avatar?v=avatars%2F3%2Fphoto.png';
    expect(result.author.avatarUrl).toBe(url);
    expect(result.comments[0].author.avatarUrl).toBe(url);
  });

  it('creates a discussion for the authenticated account', async () => {
    findCategory.mockResolvedValue({ id: 2 });
    createDiscussion.mockResolvedValue({ id: 11 });

    await expect(
      service.createDiscussion(7, {
        title: '  Полезные инструменты  ',
        post: '  Подробное описание инструмента.  ',
        category: 'tools',
      }),
    ).resolves.toEqual({ id: 11 });
    expect(createDiscussion).toHaveBeenCalledWith({
      data: {
        title: 'Полезные инструменты',
        post: 'Подробное описание инструмента.',
        authorId: 7,
        categoryId: 2,
      },
      select: { id: true },
    });
  });
});
