import { MapSceneHeaderV4 } from '@wm/shared/workshop';
import type { SerializedChunkShape } from '../interfaces/workshop-scene-graph-storage';

/** Данные страницы сцены, подготовленные для отправки на сервер. */
export interface ScenePageUpload {
  kind: 'page';
  cellX: number;
  cellY: number;
  pageId: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  body: string;
  deleted?: boolean;
}

/** Изменение слоя или группы в структуре контейнеров сцены. */
export interface SceneContainerChange {
  id: string;
  parentId?: string;
  kind: 'layer' | 'group';
  name: string;
  visible: boolean;
  locked: boolean;
  orderKey: number;
  childIndex: number;
  deleted?: boolean;
}

/** Изображение тайла превью и его координаты в пирамиде карты. */
export interface SceneTileUpload {
  kind: 'tile';
  level: number;
  x: number;
  y: number;
  png: Blob;
}

/** Неизменяемый запрос, пригодный для восстановления: повторная отправка не включает последующие правки. */
export interface PreparedSceneCommit {
  version: 1;
  accountId: number;
  mapId: number;
  idempotencyKey: string;
  expectedRevision: number;
  sourceMapId?: number;
  sourceRevision?: number;
  header: MapSceneHeaderV4;
  pages: ScenePageUpload[];
  tiles: SceneTileUpload[];
  containers: SceneContainerChange[];
  records: SerializedChunkShape[];
  removedIds: string[];
  journalCutSeq?: number;
}
