import { openWorkshopSceneDatabase } from './workshop-scene-local-db';
import {
  SceneDependencyKind,
  SceneDependencyRecord,
  SceneLocalCommit,
  SceneLocalDocument,
  SceneLocalStorageError,
  SceneWriterToken,
} from './workshop-scene-local.types';

const MAX_SEGMENT_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

/** Преобразует ошибку IndexedDB в понятную ошибку хранилища зависимостей. */
function storageError(error: DOMException | null): Error {
  if (error?.name === 'QuotaExceededError') {
    return new SceneLocalStorageError(
      'quota',
      'Недостаточно места для зависимостей карты',
    );
  }
  return error ?? new Error('Не удалось сохранить зависимость карты');
}

/** Проверяет владельца, эпоху и срок действия блокировки документа. */
function isWriter(
  document: SceneLocalDocument | undefined,
  token: SceneWriterToken,
) {
  return (
    document?.writerEpoch === token.epoch &&
    document.writerId === token.writerId &&
    (document.leaseUntil ?? 0) > Date.now()
  );
}

/**
 * Хранит проверенные зависимости локального коммита сцены.
 *
 * Сегменты записываются отдельными транзакциями, поэтому подготовка больших карт
 * не требует загружать все зависимости в память одновременно.
 */
export class SceneDependencyStore {
  /** Записывает очередной проверенный сегмент потока зависимостей. */
  async put(
    token: SceneWriterToken,
    record: SceneDependencyRecord,
    cursor: number,
    digest: string,
  ): Promise<void> {
    if (
      record.documentKey !== token.documentKey ||
      !Number.isSafeInteger(record.segment) ||
      record.segment < 0 ||
      !Number.isSafeInteger(cursor) ||
      cursor < 0 ||
      !digest ||
      !record.digest ||
      (record.body === undefined) === (record.blob === undefined)
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Неверная запись зависимости карты',
      );
    }

    const bytes =
      record.blob?.size ?? encoder.encode(record.body ?? '').byteLength;
    if (
      bytes !== record.byteLength ||
      bytes > (record.kind === 'preview-plan' ? 64 * 1024 : MAX_SEGMENT_BYTES)
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Сегмент зависимости превышает лимит',
      );
    }

    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['documents', 'localCommits', 'sceneDependencies'],
        'readwrite',
      );
      const docRequest = tx.objectStore('documents').get(token.documentKey);
      docRequest.onsuccess = () => {
        if (
          !isWriter(docRequest.result as SceneLocalDocument | undefined, token)
        ) {
          tx.abort();
          return;
        }

        const commits = tx.objectStore('localCommits');
        const request = commits.get([record.documentKey, record.localCommitId]);
        request.onsuccess = () => {
          const commit = request.result as SceneLocalCommit | undefined;
          if (
            !commit ||
            commit.state !== 'preparing' ||
            commit.dependenciesComplete ||
            (commit.dependencyCursor ?? 0) !== cursor - 1
          ) {
            tx.abort();
            return;
          }

          tx.objectStore('sceneDependencies').add(record);
          commits.put({
            ...commit,
            dependencyCursor: cursor,
            dependencyDigest: digest,
            preparationStage: 'dependencies',
          });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  /**
   * Отмечает зависимости полными после проверки завершающего кадра.
   *
   * Вызывать метод можно только после того, как кодек подтвердил контрольную
   * сумму и точный конец потока.
   */
  async complete(
    token: SceneWriterToken,
    localCommitId: string,
    cursor: number,
    digest: string,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const docRequest = tx.objectStore('documents').get(token.documentKey);
      docRequest.onsuccess = () => {
        if (
          !isWriter(docRequest.result as SceneLocalDocument | undefined, token)
        ) {
          tx.abort();
          return;
        }

        const commits = tx.objectStore('localCommits');
        const request = commits.get([token.documentKey, localCommitId]);
        request.onsuccess = () => {
          const commit = request.result as SceneLocalCommit | undefined;
          if (
            !commit ||
            commit.state !== 'preparing' ||
            (commit.dependencyCursor ?? 0) !== cursor ||
            (commit.dependencyDigest ?? '') !== (cursor === 0 ? '' : digest)
          ) {
            tx.abort();
            return;
          }

          commits.put({
            ...commit,
            dependencyDigest: digest,
            dependenciesComplete: true,
            preparationStage: 'pages',
          });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  /** Читает один сегмент зависимости по ключу коммита и ресурса. */
  async read(
    documentKey: string,
    localCommitId: string,
    kind: SceneDependencyKind,
    resourceKey: string,
    segment = 0,
  ): Promise<SceneDependencyRecord | null> {
    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction('sceneDependencies', 'readonly')
        .objectStore('sceneDependencies')
        .get([documentKey, localCommitId, kind, resourceKey, segment]);
      request.onsuccess = () =>
        resolve((request.result as SceneDependencyRecord | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Перечисляет зависимости указанного типа постранично. */
  async list(
    documentKey: string,
    localCommitId: string,
    kind: SceneDependencyKind,
    after: readonly [string, number] | null = null,
    limit = 16,
  ): Promise<SceneDependencyRecord[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 16) {
      throw new RangeError('Invalid dependency page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sceneDependencies', 'readonly');
      const lower = [
        documentKey,
        localCommitId,
        kind,
        after?.[0] ?? '',
        after?.[1] ?? 0,
      ];
      const upper = [
        documentKey,
        localCommitId,
        kind,
        '\uffff',
        Number.MAX_SAFE_INTEGER,
      ];
      const request = tx
        .objectStore('sceneDependencies')
        .openCursor(IDBKeyRange.bound(lower, upper, after !== null));

      const records: SceneDependencyRecord[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || records.length === limit) return;

        records.push(cursor.value as SceneDependencyRecord);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(records);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  /** Перечисляет страницы сцены, относящиеся к указанной ячейке карты. */
  async listCellPages(
    documentKey: string,
    localCommitId: string,
    cell: string,
    afterKey = '',
    limit = 16,
  ): Promise<SceneDependencyRecord[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 16) {
      throw new RangeError('Invalid dependency page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sceneDependencies', 'readonly');
      const prefix = `${cell}:`;
      const lower = [documentKey, localCommitId, 'page', afterKey || prefix, 0];
      const upper = [
        documentKey,
        localCommitId,
        'page',
        `${prefix}\uffff`,
        Number.MAX_SAFE_INTEGER,
      ];
      const request = tx
        .objectStore('sceneDependencies')
        .openCursor(IDBKeyRange.bound(lower, upper, Boolean(afterKey)));

      const records: SceneDependencyRecord[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || records.length === limit) return;

        records.push(cursor.value as SceneDependencyRecord);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(records);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  /** Читает сегменты одного ресурса после указанного номера. */
  async listResource(
    documentKey: string,
    localCommitId: string,
    kind: SceneDependencyKind,
    resourceKey: string,
    afterSegment = -1,
    limit = 16,
  ): Promise<SceneDependencyRecord[]> {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 16 ||
      !Number.isSafeInteger(afterSegment) ||
      afterSegment < -1
    )
      throw new RangeError('Invalid dependency page size');

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sceneDependencies', 'readonly');
      const request = tx
        .objectStore('sceneDependencies')
        .openCursor(
          IDBKeyRange.bound(
            [documentKey, localCommitId, kind, resourceKey, afterSegment + 1],
            [
              documentKey,
              localCommitId,
              kind,
              resourceKey,
              Number.MAX_SAFE_INTEGER,
            ],
          ),
        );

      const records: SceneDependencyRecord[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || records.length === limit) return;
        records.push(cursor.value as SceneDependencyRecord);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(records);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }
}
