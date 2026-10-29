import type { SerializedChunkShape } from './workshop-scene-graph-storage';
import type { SceneContainerChange } from '../services/scene-commit.types';
import type { MapSceneHeaderV4 } from '@wm/shared/workshop';

/** Сохранённый локально черновик сцены Workshop. */
export interface WorkshopSceneDraft {
  version: 1;
  accountId: number;
  mapId: number;
  baseRevision: number;
  rootId?: string;
  sourceMapId?: number;
  sourceRevision?: number;
  sourceHeader?: MapSceneHeaderV4;
  changedPages: string[];
  removedIds: string[];
  records: SerializedChunkShape[];
  containers: SceneContainerChange[];
}
