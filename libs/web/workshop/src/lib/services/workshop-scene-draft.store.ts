import { SerializedChunkShape } from './workshop-scene-graph-storage.service';
import {
  PreparedSceneCommit,
  SceneContainerChange,
} from './scene-commit.types';
import { MapSceneHeaderV4 } from '@wm/shared/workshop';
import { openWorkshopSceneDatabase } from './workshop-scene-local-db';

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

/** IndexedDB stores only unsaved scene mutations; missing objects remain on the server. */
export class WorkshopSceneDraftStore {
  async read(
    accountId: number,
    mapId: number,
  ): Promise<WorkshopSceneDraft | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction('drafts', 'readonly')
        .objectStore('drafts')
        .get(this.#key(accountId, mapId));
      request.onsuccess = () =>
        resolve((request.result as WorkshopSceneDraft | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async write(draft: WorkshopSceneDraft): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction
        .objectStore('drafts')
        .put(draft, this.#key(draft.accountId, draft.mapId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async remove(accountId: number, mapId: number): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(this.#key(accountId, mapId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async readCommit(
    accountId: number,
    mapId: number,
  ): Promise<PreparedSceneCommit | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction('commits', 'readonly')
        .objectStore('commits')
        .get(this.#key(accountId, mapId));
      request.onsuccess = () =>
        resolve((request.result as PreparedSceneCommit | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async writeCommit(commit: PreparedSceneCommit) {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('commits', 'readwrite');
      transaction
        .objectStore('commits')
        .put(commit, this.#key(commit.accountId, commit.mapId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async removeCommit(accountId: number, mapId: number) {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('commits', 'readwrite');
      transaction.objectStore('commits').delete(this.#key(accountId, mapId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  #key(accountId: number, mapId: number) {
    return `${accountId}:${mapId}`;
  }
}
