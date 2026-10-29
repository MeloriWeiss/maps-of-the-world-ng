/** Ключ страницы сцены в координатах карты. */
export interface PageKey {
  cellX: number;
  cellY: number;
  pageId: number;
}
/** Запись страницы сцены, полученная из базы данных. */
export interface PageRow extends PageKey {
  mapId: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  body: string;
}
/** Запись части объекта сцены, полученная из базы данных. */
export interface ObjectPartRow extends PageKey {
  mapId: number;
  objectId: string;
  partId: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
/** Ссылка на текстуру, используемую объектом сцены. */
export interface TextureRefRow extends PageKey {
  mapId: number;
  textureId: string;
}
