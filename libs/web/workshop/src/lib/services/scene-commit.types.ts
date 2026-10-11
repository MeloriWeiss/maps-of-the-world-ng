import { MapSceneHeaderV4 } from '@wm/shared/workshop';
import { SerializedChunkShape } from './workshop-scene-graph-storage.service';

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

export interface SceneTileUpload {
  kind: 'tile';
  level: number;
  x: number;
  y: number;
  png: Blob;
}

/** Immutable, recoverable request: retries never incorporate later edits. */
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
