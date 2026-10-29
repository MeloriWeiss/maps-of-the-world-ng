import type { Prisma } from '@wm/api/database-main';
import type { publicTexturePackSelect } from '../utils/texture-pack.select';

/** Поля набора текстур, доступные в публичном API. */
export type PublicTexturePack = Prisma.TexturePackGetPayload<{
  select: ReturnType<typeof publicTexturePackSelect>;
}>;
