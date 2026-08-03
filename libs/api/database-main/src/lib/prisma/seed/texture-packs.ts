import { SeedPrismaClient } from './client';
import { daysAgo } from './dates';
import { type SeedImage, uploadSeedImages } from './storage';
import { SeedAccount } from './types';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';

const textureAssetBaseNames = [
  'medieval-cobblestone',
  'dwarven-basalt',
  'forest-ground',
  'ship-deck',
  'desert-sandstone',
  'snow-ice',
  'necromancer-floor',
  'tavern-wood',
  'imperial-road',
  'swamp-ground',
  'elven-paving',
  'volcanic-rock',
] as const;

const textureVariantsPerPack = 4;
const textureSeedVersion = 2;
const textureAssetNames = textureAssetBaseNames.flatMap((baseName) => [
  `${baseName}.png`,
  `${baseName}-v2.png`,
  `${baseName}-v3.png`,
  `${baseName}-v4.png`,
]);

const textureAssetsDirectory = resolve(
  process.cwd(),
  'libs/api/database-main/src/lib/prisma/seed/assets/texture-packs',
);

const packNames = [
  'Средневековый город',
  'Дварфийская крепость',
  'Лесные тропы',
  'Морские приключения',
  'Пустынные руины',
  'Снежный север',
  'Подземелье некроманта',
  'Уютная таверна',
  'Имперские дороги',
  'Болотные земли',
  'Эльфийские сады',
  'Вулканические пещеры',
  'Черновик: восточный дворец',
  'Черновик: фермерская деревня',
  'Пустой черновик',
];

export async function seedTexturePacks(
  prisma: SeedPrismaClient,
  accounts: SeedAccount[],
) {
  const images: SeedImage[] = accounts.map((account) => ({
    objectKey: `seed/avatars/${account.username}.png`,
  }));
  const textureAssets = await Promise.all(
    textureAssetNames.map(async (fileName, index) => {
      const sourcePath = resolve(textureAssetsDirectory, fileName);
      const file = await stat(sourcePath);
      const themeIndex = Math.floor(index / textureVariantsPerPack);
      const variantIndex = index % textureVariantsPerPack;
      const baseWidth =
        themeIndex % 4 === 0 || themeIndex % 4 === 2 ? 314 : 313;
      const isQuarterTurn = variantIndex === 1 || variantIndex === 3;
      return {
        sourcePath,
        size: file.size,
        width: isQuarterTurn ? 418 : baseWidth,
        height: isQuarterTurn ? baseWidth : 418,
      };
    }),
  );

  for (let packIndex = 0; packIndex < packNames.length; packIndex += 1) {
    const owner = accounts[packIndex % (accounts.length - 1)];
    const isPublished = packIndex < 12;
    const packId = `10000000-0000-4000-8000-${String(packIndex + 1).padStart(12, '0')}`;
    const createdAt = daysAgo(90 - packIndex * 4);
    const pack = await prisma.texturePack.create({
      data: {
        id: packId,
        name: packNames[packIndex],
        description:
          packIndex === 14
            ? null
            : `Готовый набор графики «${packNames[packIndex]}» для демонстрации каталога и мастерской.`,
        isPublished,
        publishedAt: isPublished ? daysAgo(60 - packIndex * 3) : null,
        createdAt,
        updatedAt: daysAgo(Math.max(1, 20 - packIndex)),
        accountId: owner.accountId,
      },
    });

    const textureCount = packIndex === 0 ? 62 : packIndex === 14 ? 0 : 10;
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex += 1) {
      const objectKey = `seed/v${textureSeedVersion}/textures/pack-${packIndex + 1}/texture-${textureIndex + 1}.png`;
      const themeOffset =
        (packIndex % textureAssetBaseNames.length) * textureVariantsPerPack;
      const asset =
        textureAssets[themeOffset + (textureIndex % textureVariantsPerPack)];
      images.push({ objectKey, sourcePath: asset.sourcePath });
      await prisma.texture.create({
        data: {
          id: `2${textureSeedVersion}000000-0000-4000-8000-${String(packIndex + 1).padStart(4, '0')}${String(textureIndex + 1).padStart(8, '0')}`,
          name: `Текстура ${textureIndex + 1}: ${packNames[packIndex]}`,
          objectKey,
          mimeType: 'image/png',
          size: asset.size,
          width: asset.width,
          height: asset.height,
          createdAt: new Date(createdAt.getTime() + textureIndex * 60_000),
          accountId: owner.accountId,
          packId: pack.id,
        },
      });
    }

    const likers = isPublished
      ? accounts.filter(
          (account, accountIndex) =>
            account.accountId !== owner.accountId &&
            (packIndex + accountIndex) % 2 === 0,
        )
      : [];
    if (likers.length > 0) {
      await prisma.texturePackLike.createMany({
        data: likers.map((account) => ({
          accountId: account.accountId,
          texturePackId: pack.id,
          createdAt: daysAgo(14 - (packIndex % 10)),
        })),
      });
      await prisma.texturePack.update({
        where: { id: pack.id },
        data: { likesCount: likers.length },
      });
    }
  }

  await uploadSeedImages(images);
  console.log('Texture packs: 15 (12 published, 3 drafts); textures: 192');
}
