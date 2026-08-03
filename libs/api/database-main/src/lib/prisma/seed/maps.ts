import { SeedPrismaClient } from './client';
import { daysAgo } from './dates';
import { SeedAccount } from './types';

const mapNames = [
  'Королевство семи рек',
  'Дварфийские чертоги',
  'Архипелаг штормов',
  'Лес Серебряной Луны',
  'Пустыня забытых богов',
  'Северный рубеж',
  'Торговые пути Империи',
  'Окрестности Драконьей горы',
  'Подземелья Чёрного замка',
  'Долина вечного тумана',
  'Побережье пиратов',
  'Земли кочевых племён',
];

const comments = [
  'Отличная основа для новой кампании!',
  'Можно добавить больше поселений на востоке?',
  'Очень понравилась работа с рельефом.',
  'Использовал эту карту на прошлой игре — игроки оценили.',
  'Подскажите, какой текстур-пак использовался?',
];

export async function seedMaps(
  prisma: SeedPrismaClient,
  accounts: SeedAccount[],
) {
  for (let index = 0; index < 36; index += 1) {
    const owner = accounts[index % (accounts.length - 1)];
    const isPublished = index < 30;
    const map = await prisma.map.create({
      data: {
        name: `${mapNames[index % mapNames.length]} ${Math.floor(index / mapNames.length) + 1}`,
        body: JSON.stringify({
          version: 1,
          canvas: { width: 2800, height: 1600 },
          shapes: [],
        }),
        description:
          index % 7 === 0
            ? null
            : `Демонстрационная карта для проверки каталога, профиля и редактора. Вариант ${index + 1}.`,
        isPublished,
        accountId: owner.accountId,
      },
    });

    const mapComments = isPublished ? (index % 5) + 1 : 0;
    for (let commentIndex = 0; commentIndex < mapComments; commentIndex += 1) {
      const author = accounts[(index + commentIndex + 1) % accounts.length];
      await prisma.mapComment.create({
        data: {
          comment: comments[(index + commentIndex) % comments.length],
          mapId: map.id,
          authorId: author.accountId,
          createdAt: daysAgo(35 - (index % 30), commentIndex),
        },
      });
    }

    const likers = isPublished
      ? accounts.filter(
          (account, accountIndex) =>
            account.accountId !== owner.accountId &&
            (index + accountIndex) % 3 !== 0,
        )
      : [];
    if (likers.length > 0) {
      await prisma.mapLike.createMany({
        data: likers.map((account, likeIndex) => ({
          accountId: account.accountId,
          mapId: map.id,
          createdAt: daysAgo(20 - (index % 15), likeIndex),
        })),
      });
    }
    await prisma.map.update({
      where: { id: map.id },
      data: {
        commentsCount: mapComments,
        likesCount: likers.length,
      },
    });
  }

  console.log('Maps: 36 (30 published, 6 drafts)');
}
