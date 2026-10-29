/** Краткие данные карты для каталога и списка профиля. */
export interface MapSummary {
  id: number;
  name: string;
  description: string | null;
  isPublished: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

/** Опубликованная карта с автором и признаком отметки пользователя. */
export interface PublishedMapSummary extends MapSummary {
  isLiked: boolean;
  author: {
    id: number;
    nickname: string;
  };
}

/** Страница каталога опубликованных карт. */
export interface PublishedMapPage {
  items: PublishedMapSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** Локальные данные карты вместе с сериализованным содержимым. */
export interface StoredMap extends MapSummary {
  revision?: number;
  body: string;
}

/** Сохранённая опубликованная карта с автором и отметкой пользователя. */
export interface PublishedStoredMap extends StoredMap {
  isLiked: boolean;
  author: {
    id: number;
    nickname: string;
  };
}

/** Поля, отправляемые при создании или сохранении карты. */
export interface SaveMap {
  name: string;
  description?: string;
  body?: string;
}

/** Состояние отметки карты и её текущий счётчик. */
export interface LikeState {
  isLiked: boolean;
  likesCount: number;
}
