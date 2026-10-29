import type { WorkshopSceneDraft } from '../interfaces/workshop-scene-draft';

import { PreparedSceneCommit } from './scene-commit.types';

import { openWorkshopSceneDatabase } from './workshop-scene-local-db';

/**
 * Хранит локальные черновики и подготовленные коммиты Workshop в IndexedDB.
 *
 * Полные данные объектов остаются на сервере, а в браузере сохраняются только
 * изменения, необходимые для восстановления работы пользователя.
 */
export class WorkshopSceneDraftStore {
  /** Читает черновик карты пользователя из локального хранилища. */
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

  /** Сохраняет черновик карты в IndexedDB. */
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

  /** Удаляет черновик после успешного сохранения или сброса. */
  async remove(accountId: number, mapId: number): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(this.#key(accountId, mapId));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /** Читает подготовленный к отправке коммит сцены. */
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

  /** Сохраняет подготовленный коммит для повтора незавершённой отправки. */
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

  /** Удаляет сохранённый коммит после подтверждения публикации. */
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

  /** Формирует составной ключ черновика пользователя и карты. */
  #key(accountId: number, mapId: number) {
    return `${accountId}:${mapId}`;
  }
}
