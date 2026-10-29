/** Открывает общую версионируемую базу IndexedDB для локальных хранилищ Workshop. */
let databasePromise: Promise<IDBDatabase> | null = null;

/** Открывает или возвращает общий экземпляр локальной базы Workshop. */
export function openWorkshopSceneDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('workshop-scene-drafts', 5);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains('drafts'))
        database.createObjectStore('drafts');
      if (!database.objectStoreNames.contains('commits'))
        database.createObjectStore('commits');

      if (!database.objectStoreNames.contains('documents')) {
        const documents = database.createObjectStore('documents', {
          keyPath: 'documentKey',
        });
        documents.createIndex('byMap', ['accountId', 'mapId'], {
          unique: true,
        });
      }

      if (!database.objectStoreNames.contains('operations')) {
        database.createObjectStore('operations', {
          keyPath: ['documentKey', 'seq'],
        });
      }

      if (!database.objectStoreNames.contains('mutations')) {
        const mutations = database.createObjectStore('mutations', {
          keyPath: ['documentKey', 'seq', 'entityType', 'entityId'],
        });
        mutations.createIndex('byEntity', [
          'documentKey',
          'entityType',
          'entityId',
          'seq',
        ]);
      }

      if (!database.objectStoreNames.contains('localCommits')) {
        database.createObjectStore('localCommits', {
          keyPath: ['documentKey', 'localCommitId'],
        });
      }

      if (!database.objectStoreNames.contains('commitParts')) {
        const parts = database.createObjectStore('commitParts', {
          keyPath: ['documentKey', 'localCommitId', 'kind', 'partKey'],
        });
        parts.createIndex('byOrdinal', [
          'documentKey',
          'localCommitId',
          'kind',
          'ordinal',
        ]);
      }

      if (!database.objectStoreNames.contains('commitPartDescriptors')) {
        const descriptors = database.createObjectStore(
          'commitPartDescriptors',
          {
            keyPath: ['documentKey', 'localCommitId', 'kind', 'ordinal'],
          },
        );
        descriptors.createIndex('byPartKey', [
          'documentKey',
          'localCommitId',
          'kind',
          'partKey',
        ]);
      }

      if (!database.objectStoreNames.contains('commitWork')) {
        const work = database.createObjectStore('commitWork', {
          keyPath: ['documentKey', 'localCommitId', 'taskKey'],
        });
        work.createIndex('byStatus', [
          'documentKey',
          'localCommitId',
          'status',
        ]);
      }

      const work = request.transaction?.objectStore('commitWork');
      if (work && !work.indexNames.contains('byFinalCell')) {
        work.createIndex('byFinalCell', [
          'documentKey',
          'localCommitId',
          'cellX',
          'cellY',
          'partId',
        ]);
      }

      if (work && !work.indexNames.contains('byFinalOrder')) {
        work.createIndex('byFinalOrder', [
          'documentKey',
          'localCommitId',
          'orderPath',
          'partId',
        ]);
      }

      if (work && !work.indexNames.contains('byPreviewLeaf')) {
        work.createIndex('byPreviewLeaf', [
          'documentKey',
          'localCommitId',
          'level',
          'x',
          'y',
          'rank',
          'partId',
        ]);
      }

      if (!database.objectStoreNames.contains('uploadReceipts')) {
        database.createObjectStore('uploadReceipts', {
          keyPath: [
            'documentKey',
            'localCommitId',
            'attemptId',
            'kind',
            'partKey',
          ],
        });
      }

      if (!database.objectStoreNames.contains('sceneDependencies')) {
        database.createObjectStore('sceneDependencies', {
          keyPath: [
            'documentKey',
            'localCommitId',
            'kind',
            'resourceKey',
            'segment',
          ],
        });
      }

      if (!database.objectStoreNames.contains('bundleFrames')) {
        const frames = database.createObjectStore('bundleFrames', {
          keyPath: ['documentKey', 'localCommitId', 'bundleId', 'ordinal'],
        });
        frames.createIndex('byOffset', [
          'documentKey',
          'localCommitId',
          'bundleId',
          'offset',
        ]);
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    const fail = () => {
      databasePromise = null;
      reject(
        request.error ?? new Error('Workshop local database is unavailable'),
      );
    };

    request.onerror = fail;
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Close other Workshop tabs to update local storage'));
    };
  });
  return databasePromise;
}

/** Ожидает успешного завершения транзакции IndexedDB. */
export function transactionCompleted(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error('Workshop storage transaction failed'),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Workshop storage transaction aborted'),
      );
  });
}

/** Преобразует результат или ошибку запроса IndexedDB в Promise. */
export function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Workshop storage request failed'));
  });
}
