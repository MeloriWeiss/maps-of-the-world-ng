import { SeedPrismaClient } from './client';
import { daysAgo } from './dates';
import { SeedAccount } from './types';

const categories = [
  {
    slug: 'maps',
    title: 'Карты',
    description: 'Создание, публикация и обсуждение игровых карт',
  },
  {
    slug: 'tools',
    title: 'Инструменты',
    description: 'Инструменты редактора и советы по работе',
  },
  {
    slug: 'texture-packs',
    title: 'Текстур-паки',
    description: 'Наборы текстур и графические материалы',
  },
  {
    slug: 'game-mastering',
    title: 'Мастерская ведущего',
    description: 'Подготовка и проведение настольных ролевых игр',
  },
  {
    slug: 'worldbuilding',
    title: 'Создание миров',
    description: 'География, история, народы и логика вашего мира',
  },
  {
    slug: 'feedback',
    title: 'Предложения и ошибки',
    description: 'Идеи для GameMaster Helper и сообщения о неполадках',
  },
] as const;

const topics = [
  'Как подготовить карту города к первой сессии',
  'Делимся картами подземелий',
  'Горячие клавиши редактора',
  'Как сделать естественную береговую линию',
  'Набор текстур для зимней кампании',
  'Оптимальный размер сетки для боевой карты',
  'Советы по созданию леса и растительности',
  'Как организовать библиотеку текстур',
  'Экспорт карты для печати',
  'Идеи для случайных встреч в дороге',
  'Показываем свои первые карты',
];

const messages = [
  'Спасибо за подробное объяснение, обязательно попробую на следующей карте.',
  'У меня похожий подход, но для больших карт я использую более крупную сетку.',
  'Можно приложить пример настроек? Думаю, это поможет начинающим авторам.',
  'Проверил в своей кампании — способ действительно хорошо работает.',
  'Интересная идея. Ещё можно добавить несколько вариантов для разных биомов.',
];

export async function seedForum(
  prisma: SeedPrismaClient,
  accounts: SeedAccount[],
) {
  const categoryRecords = [];
  for (const [index, category] of categories.entries()) {
    categoryRecords.push(
      await prisma.forumCategory.create({
        data: { ...category, sortOrder: (index + 1) * 10 },
      }),
    );
  }

  for (let index = 0; index < 55; index += 1) {
    const author = accounts[index % accounts.length];
    const category = categoryRecords[index % categoryRecords.length];
    const createdAt = daysAgo(54 - index);
    const forum = await prisma.forum.create({
      data: {
        title: `${topics[index % topics.length]} — часть ${Math.floor(index / topics.length) + 1}`,
        post:
          `Демонстрационное обсуждение №${index + 1}. ` +
          'Здесь находится достаточно длинный текст публикации, чтобы проверить переносы, поиск, SEO-описание и отображение темы на разных экранах.',
        authorId: author.accountId,
        categoryId: category.id,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const rootCount = (index % 3) + 1;
    const rootIds: number[] = [];
    for (let commentIndex = 0; commentIndex < rootCount; commentIndex += 1) {
      const commentAuthor =
        accounts[(index + commentIndex + 1) % accounts.length];
      const comment = await prisma.forumComment.create({
        data: {
          comment: messages[(index + commentIndex) % messages.length],
          forumId: forum.id,
          authorId: commentAuthor.accountId,
          createdAt: new Date(
            createdAt.getTime() + (commentIndex + 1) * 3_600_000,
          ),
        },
      });
      rootIds.push(comment.id);
    }

    let repliesCount = 0;
    if (index % 2 === 0) {
      const replyAuthor = accounts[(index + 4) % accounts.length];
      const reply = await prisma.forumComment.create({
        data: {
          comment:
            'Ответ на первый комментарий: согласен, этот вариант стоит добавить в руководство.',
          forumId: forum.id,
          authorId: replyAuthor.accountId,
          parentId: rootIds[0],
          createdAt: new Date(createdAt.getTime() + 6 * 3_600_000),
        },
      });
      repliesCount += 1;
      if (index % 4 === 0) {
        await prisma.forumComment.create({
          data: {
            comment:
              'Вложенный ответ для проверки третьего уровня дерева комментариев.',
            forumId: forum.id,
            authorId: accounts[(index + 5) % accounts.length].accountId,
            parentId: reply.id,
            createdAt: new Date(createdAt.getTime() + 7 * 3_600_000),
          },
        });
        repliesCount += 1;
      }
    }

    const likers = accounts.filter(
      (account, accountIndex) =>
        account.accountId !== author.accountId &&
        (index + accountIndex) % 3 === 0,
    );
    if (likers.length > 0) {
      await prisma.forumLike.createMany({
        data: likers.map((account) => ({
          accountId: account.accountId,
          forumId: forum.id,
          createdAt: daysAgo(Math.max(0, 20 - (index % 20))),
        })),
      });
    }
    await prisma.forum.update({
      where: { id: forum.id },
      data: {
        commentsCount: rootCount + repliesCount,
        likesCount: likers.length,
        updatedAt: new Date(
          createdAt.getTime() + (rootCount + repliesCount + 1) * 3_600_000,
        ),
        lastActivityAt: new Date(
          createdAt.getTime() + (rootCount + repliesCount + 1) * 3_600_000,
        ),
      },
    });
  }

  console.log('Forum: 6 categories, 55 discussions with nested comments');
}
