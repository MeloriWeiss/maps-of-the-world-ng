import { TextureKind } from '@wm/shared/workshop';

/** Метаданные одной текстуры, полученные от API. */
export interface TextureItem {
  kind?: TextureKind;
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/** Метаданные текстуры с готовым URL для отображения файла. */
export interface TextureItemView extends TextureItem {
  fileUrl: string;
}

/** Набор текстур и его счётчики в ответе API. */
export interface TexturePack {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  previewTextures: TextureItem[];
  _count: {
    textures: number;
  };
}

/** Автор опубликованного набора текстур. */
export interface TexturePackAuthor {
  id: number;
  nickname: string;
}

/** Опубликованный набор с признаком отметки текущего пользователя. */
export interface PublishedTexturePack extends TexturePack {
  isLiked: boolean;
  author: TexturePackAuthor;
}

/** Данные набора для интерфейса с URL превью текстур. */
export interface TexturePackView extends Omit<TexturePack, 'previewTextures'> {
  previewTextures: TextureItemView[];
}

/** Подробности набора без списка превью, который загружается отдельно. */
export type TexturePackDetails = Omit<TexturePack, 'previewTextures'>;

/** Опубликованный набор для интерфейса с URL превью текстур. */
export interface PublishedTexturePackView
  extends Omit<PublishedTexturePack, 'previewTextures'> {
  previewTextures: TextureItemView[];
}

/** Страница каталога опубликованных наборов. */
export interface PublishedTexturePackPage {
  items: PublishedTexturePack[];
  total: number;
  page: number;
  pageSize: number;
}

/** Страница каталога с подготовленными URL превью для карточек. */
export interface PublishedTexturePackPageView
  extends Omit<PublishedTexturePackPage, 'items'> {
  items: PublishedTexturePackView[];
}

/** Подробности опубликованного набора без превью, загружаемых отдельно. */
export type PublishedTexturePackDetails = Omit<
  PublishedTexturePack,
  'previewTextures'
>;

/** Данные формы для создания набора текстур. */
export interface CreateTexturePack {
  name: string;
  description?: string;
}

/** Данные формы для изменения метаданных набора текстур. */
export interface UpdateTexturePack {
  name: string;
  description?: string;
}

/** Текущее состояние отметки набора и число отметок. */
export interface TexturePackLikeState {
  isLiked: boolean;
  likesCount: number;
}

/** Страница текстур одного вида в ответе API. */
export interface TexturePage {
  items: TextureItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Страница текстур с готовыми URL файлов для интерфейса. */
export interface TexturePageView extends Omit<TexturePage, 'items'> {
  items: TextureItemView[];
}
