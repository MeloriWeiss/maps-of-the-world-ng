import * as bcrypt from 'bcrypt';
import { AppTheme } from '../../generated/prisma/enums';
import { SeedPrismaClient } from './client';
import { daysAgo } from './dates';
import { SeedAccount } from './types';

export const SEED_PASSWORD = 'Admin123';

const users = [
  {
    email: 'admin@example.com',
    username: 'admin',
    nickname: 'Хранитель Атласа',
    firstName: 'Александр',
    lastName: 'Картографов',
    bio: 'Администратор и автор демонстрационных миров.',
    language: 'ru',
    theme: AppTheme.DARK,
  },
  {
    email: 'user@example.com',
    username: 'user',
    nickname: 'Странствующий мастер',
    firstName: 'Мария',
    lastName: 'Ветрова',
    bio: 'Веду кампании и собираю красивые карты.',
    language: 'ru',
    theme: AppTheme.LIGHT,
  },
  {
    email: 'dwarf@example.com',
    username: 'dwarf_master',
    nickname: 'Дварфийский архитектор',
    firstName: 'Борис',
    lastName: 'Каменный',
    bio: 'Люблю подземелья, шахты и суровые горные крепости.',
    language: 'ru',
    theme: AppTheme.DARK,
  },
  {
    email: 'elf@example.com',
    username: 'elven_mapper',
    nickname: 'Лесная разведчица',
    firstName: 'Элина',
    lastName: 'Листопад',
    bio: 'Создаю лесные поселения и природные ландшафты.',
    language: 'ru',
    theme: AppTheme.LIGHT,
  },
  {
    email: 'sea@example.com',
    username: 'sea_wolf',
    nickname: 'Морской волк',
    firstName: 'Виктор',
    lastName: 'Штормов',
    bio: 'Острова, морские пути и пиратские приключения.',
    language: 'ru',
    theme: AppTheme.DEFAULT,
  },
  {
    email: 'desert@example.com',
    username: 'desert_fox',
    nickname: 'Песчаная лисица',
    firstName: 'Алина',
    lastName: 'Солнечная',
    bio: 'Рисую пустыни, караванные маршруты и древние руины.',
    language: 'ru',
    theme: AppTheme.DEFAULT,
  },
  {
    email: 'north@example.com',
    username: 'north_guard',
    nickname: 'Страж Севера',
    firstName: 'Игорь',
    lastName: 'Северный',
    bio: 'Снежные земли и опасные перевалы.',
    language: 'ru',
    theme: AppTheme.DARK,
  },
  {
    email: 'newcomer@example.com',
    username: 'newcomer',
    nickname: 'Начинающий мастер',
    firstName: 'Олег',
    lastName: 'Новиков',
    bio: null,
    language: 'ru',
    theme: AppTheme.DEFAULT,
  },
] as const;

export async function seedUsers(prisma: SeedPrismaClient) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const result: SeedAccount[] = [];

  for (const [index, userData] of users.entries()) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        personalAccount: {
          create: {
            nickname: userData.nickname,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phoneNumber: index < 2 ? `+7999000000${index}` : null,
            birthDate: index < 2 ? `199${index}-0${index + 1}-15` : null,
            bio: userData.bio,
            avatarUrl: `seed/avatars/${userData.username}.png`,
            language: userData.language,
            theme: userData.theme,
            createdAt: daysAgo(180 - index * 12),
          },
        },
      },
      include: { personalAccount: true },
    });
    if (!user.personalAccount)
      throw new Error(`Account missing for ${user.email}`);
    result.push({
      userId: user.id,
      accountId: user.personalAccount.id,
      username: user.username,
      nickname: user.personalAccount.nickname,
    });
  }

  console.log(
    `Users and accounts: ${result.length} (password: ${SEED_PASSWORD})`,
  );
  return result;
}
