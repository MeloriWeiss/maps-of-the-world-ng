import type {
  PublishedTexturePack,
  PublishedTexturePackView,
  PublishedTexturePackPage,
  PublishedTexturePackPageView,
  TextureItem,
  TextureItemView,
  TexturePack,
  TexturePackView,
  TexturePage,
  TexturePageView,
} from '../interfaces';

/** Добавляет URL файла к метаданным текстуры, сохраняя исходный объект. */
export function toTextureView(
  texture: TextureItem,
  baseUrl: string,
): TextureItemView {
  return { ...texture, fileUrl: `${baseUrl}textures/${texture.id}/file` };
}

/** Подготавливает превью собственного набора для отображения. */
export function toTexturePackView(
  pack: TexturePack,
  baseUrl: string,
): TexturePackView {
  return {
    ...pack,
    previewTextures: pack.previewTextures.map((texture) =>
      toTextureView(texture, baseUrl),
    ),
  };
}

/** Подготавливает превью опубликованного набора, сохраняя данные автора и отметок. */
export function toPublishedTexturePackView(
  pack: PublishedTexturePack,
  baseUrl: string,
): PublishedTexturePackView {
  return {
    ...pack,
    previewTextures: pack.previewTextures.map((texture) =>
      toTextureView(texture, baseUrl),
    ),
  };
}

/** Преобразует элементы каталога, сохраняя метаданные пагинации. */
export function toPublishedTexturePackPageView(
  page: PublishedTexturePackPage,
  baseUrl: string,
): PublishedTexturePackPageView {
  return {
    ...page,
    items: page.items.map((pack) => toPublishedTexturePackView(pack, baseUrl)),
  };
}

/** Добавляет URL файлов ко всем текстурам страницы без изменения её счётчиков. */
export function toTexturePageView(
  page: TexturePage,
  baseUrl: string,
): TexturePageView {
  return {
    ...page,
    items: page.items.map((texture) => toTextureView(texture, baseUrl)),
  };
}
