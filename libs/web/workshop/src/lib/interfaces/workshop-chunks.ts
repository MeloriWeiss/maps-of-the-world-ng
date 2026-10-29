import type { MapScenePageDescriptor } from '@wm/shared/workshop';
import type { ScenePageUpload } from '../services/scene-commit.types';

/** Страница описаний частей карты с курсором и признаком конца выборки. */
export interface PageResponse {
  items: (MapScenePageDescriptor & { body?: string })[];
  nextCursor: string | null;
  complete: boolean;
}

/** Контейнер графа сцены и его положение среди дочерних элементов. */
export interface ContainerRecord {
  id: string;
  parentId: string | null;
  kind: string;
  name: string;
  visible: boolean;
  locked: boolean;
  orderKey: number;
  childIndex: number;
}

/** Закэшированное изображение тайла превью и версия его содержимого. */
export interface TileImage {
  image: HTMLImageElement | HTMLCanvasElement;
  url: string | null;
  created: number;
  version: number;
}

/** Краткие данные объекта сцены для списка и фильтрации. */
export interface SceneObjectSummary {
  objectId: string;
  nodeId: string;
  parentId: string;
  kind: string;
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  partCount: number;
}

/** Страница объектов сцены с курсором следующего запроса. */
export interface SceneObjectPage {
  items: SceneObjectSummary[];
  nextCursor: string | null;
  complete: boolean;
}

/** Данные страницы сцены, отправляемые в составе коммита. */
export type PageUpload = ScenePageUpload;
