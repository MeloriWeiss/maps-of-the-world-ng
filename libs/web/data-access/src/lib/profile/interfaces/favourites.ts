import type { PublishedMapSummary } from '../../maps';
import type {
  TextureItem,
  TextureItemView,
  TexturePackAuthor,
} from '../../texture-packs';

/** Опубликованная карта с датой добавления в избранное. */
export interface FavouriteMap extends PublishedMapSummary {
  likedAt: string;
}

/** Набор из избранного с готовыми URL превью. */
export interface FavouriteTexturePack {
  id: string;
  name: string;
  description: string | null;
  likesCount: number;
  likedAt: string;
  author: TexturePackAuthor;
  previewTextures: TextureItemView[];
  _count: { textures: number };
}

/** Избранные работы текущего пользователя для отображения в профиле. */
export interface Favourites {
  maps: FavouriteMap[];
  texturePacks: FavouriteTexturePack[];
}

/** Ответ API до добавления URL к метаданным превью текстур. */
export interface FavouritesResponse extends Omit<Favourites, 'texturePacks'> {
  texturePacks: Array<
    Omit<FavouriteTexturePack, 'previewTextures'> & {
      previewTextures: TextureItem[];
    }
  >;
}
