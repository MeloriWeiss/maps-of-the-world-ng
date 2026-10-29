import type { Favourites, FavouritesResponse } from '../interfaces';
import { toTextureView } from '../../texture-packs/utils/texture-pack.mapper';

/**
 * Добавляет URL файлов к превью избранных наборов, сохраняя порядок работ.
 * Метаданные карт и даты добавления в избранное передаются без изменений.
 *
 * @param favourites Ответ API со списками избранных работ.
 * @param baseUrl Базовый URL API с завершающим слешем.
 * @returns Данные для интерфейса без изменения исходного ответа.
 */
export function toFavourites(
  favourites: FavouritesResponse,
  baseUrl: string,
): Favourites {
  return {
    ...favourites,
    texturePacks: favourites.texturePacks.map((pack) => ({
      ...pack,
      previewTextures: pack.previewTextures.map((texture) =>
        toTextureView(texture, baseUrl),
      ),
    })),
  };
}
