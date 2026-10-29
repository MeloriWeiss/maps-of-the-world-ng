/** Поля записи текстуры, выбираемые из базы данных. */
export const textureSelect = {
  kind: true,
  id: true,
  name: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

/** Запрос набора текстур с данными автора и отметкой пользователя. */
export const publicTexturePackSelect = (accountId?: number) =>
  ({
    id: true,
    name: true,
    description: true,
    isPublished: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    likesCount: true,
    owner: {
      select: {
        nickname: true,
        userId: true,
      },
    },
    _count: {
      select: {
        textures: { where: { deletedAt: null } },
        likes: { where: { accountId: accountId ?? -1 } },
      },
    },
    textures: {
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: textureSelect,
    },
  }) as const;
