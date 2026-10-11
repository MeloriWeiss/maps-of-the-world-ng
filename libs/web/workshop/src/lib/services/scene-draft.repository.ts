import { MapSceneHeaderV4 } from '@wm/shared/workshop';
import { openWorkshopSceneDatabase } from './workshop-scene-local-db';
import {
  SceneEntityType,
  SceneLocalCommit,
  SceneLocalDocument,
  SceneLocalMutation,
  SceneLocalOperation,
  SceneLocalStorageError,
  SceneWriterToken,
} from './workshop-scene-local.types';

const MAX_MUTATION_BYTES = 256 * 1024;
const MAX_BATCH_RECORDS = 16;
const MAX_BATCH_BYTES = 1024 * 1024;
const LEASE_MS = 15_000;
const encoder = new TextEncoder();

export type NewSceneMutation = Omit<SceneLocalMutation, 'documentKey' | 'seq'>;

function storageError(error: DOMException | null): Error {
  if (error?.name === 'QuotaExceededError') {
    return new SceneLocalStorageError(
      'quota',
      'Недостаточно места для локального черновика',
    );
  }
  return error ?? new Error('Не удалось записать локальный черновик');
}

/** Durable source of truth. A loaded graph is only a view of this document. */
export class SceneDraftRepository {
  readonly #writerId = crypto.randomUUID();
  readonly #queues = new Map<string, Promise<void>>();

  async createDocument(
    accountId: number,
    mapId: number | undefined,
    baseRevision: number,
  ): Promise<SceneLocalDocument> {
    const db = await openWorkshopSceneDatabase();
    const localDocumentId = crypto.randomUUID();
    const document: SceneLocalDocument = {
      documentKey: `${accountId}:${localDocumentId}`,
      accountId,
      localDocumentId,
      ...(mapId !== undefined ? { mapId } : {}),
      baseRevision,
      activeSeq: 0,
      durableSeq: 0,
      acknowledgedSeq: 0,
      writerEpoch: 0,
    };
    return new Promise<SceneLocalDocument>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      let result = document;
      if (mapId !== undefined) {
        const request = store.index('byMap').get([accountId, mapId]);
        request.onsuccess = () => {
          const existing = request.result as SceneLocalDocument | undefined;
          if (existing) result = existing;
          else store.add(document);
        };
      } else {
        store.add(document);
      }
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async readDocument(documentKey: string): Promise<SceneLocalDocument | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const request = tx.objectStore('documents').get(documentKey);
      request.onsuccess = () =>
        resolve((request.result as SceneLocalDocument | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async bindMap(token: SceneWriterToken, mapId: number): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !this.#isWriter(document, token) ||
          (document.mapId !== undefined && document.mapId !== mapId)
        ) {
          tx.abort();
          return;
        }
        if (document.mapId === undefined) store.put({ ...document, mapId });
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  /** The old publisher may acknowledge its own verified server commit while transport migration is in progress. */
  async acknowledgeLegacyPublication(
    token: SceneWriterToken,
    input: {
      serverCommitId: string;
      expectedRevision: number;
      publishedRevision: number;
      cutSeq: number;
    },
  ): Promise<void> {
    if (
      !input.serverCommitId ||
      input.publishedRevision !== input.expectedRevision + 1
    ) {
      throw new SceneLocalStorageError(
        'conflict',
        'Не подтверждена версия сохранённой карты',
      );
    }
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !this.#isWriter(document, token) ||
          document.baseRevision !== input.expectedRevision ||
          document.activeCommitId ||
          input.cutSeq < document.acknowledgedSeq ||
          input.cutSeq > document.durableSeq
        ) {
          tx.abort();
          return;
        }
        store.put({
          ...document,
          baseRevision: input.publishedRevision,
          acknowledgedSeq: input.cutSeq,
        });
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async withWriter<T>(
    documentKey: string,
    action: (token: SceneWriterToken) => Promise<T>,
  ): Promise<T> {
    const previous = this.#queues.get(documentKey) ?? Promise.resolve();
    let unblock: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const tail = previous.then(() => next);
    this.#queues.set(documentKey, tail);
    await previous;
    const run = async () => {
      const token = await this.#claimWriter(documentKey);
      const heartbeat = setInterval(() => {
        void this.#renewWriter(token).catch(() => undefined);
      }, 5_000);
      try {
        return await action(token);
      } finally {
        clearInterval(heartbeat);
        await this.#releaseWriter(token).catch(() => undefined);
      }
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return await navigator.locks.request(
          `workshop-scene:${documentKey}`,
          run,
        );
      }
      return await run();
    } finally {
      unblock();
      if (this.#queues.get(documentKey) === tail)
        this.#queues.delete(documentKey);
    }
  }

  async appendOperation(
    token: SceneWriterToken,
    operationId: string,
    expectedRecords: number,
    mutations: AsyncIterable<NewSceneMutation>,
  ): Promise<number> {
    if (!Number.isSafeInteger(expectedRecords) || expectedRecords < 1) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Пустое изменение нельзя сохранить',
      );
    }
    await this.#discardIncomplete(token);
    const seq = await this.#beginOperation(token, operationId, expectedRecords);
    let batch: SceneLocalMutation[] = [];
    let batchBytes = 0;
    let total = 0;
    for await (const mutation of mutations) {
      const record: SceneLocalMutation = {
        ...mutation,
        documentKey: token.documentKey,
        seq,
      };
      const size = encoder.encode(JSON.stringify(record)).byteLength;
      if (size > MAX_MUTATION_BYTES) {
        throw new SceneLocalStorageError(
          'invalid-part',
          'Часть объекта превышает локальный лимит 256 KiB',
        );
      }
      if (
        batch.length === MAX_BATCH_RECORDS ||
        batchBytes + size > MAX_BATCH_BYTES
      ) {
        await this.#writeMutationBatch(token, batch);
        batch = [];
        batchBytes = 0;
      }
      batch.push(record);
      batchBytes += size;
      total++;
    }
    if (total !== expectedRecords) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Количество частей изменения не совпало',
      );
    }
    if (batch.length) await this.#writeMutationBatch(token, batch);
    await this.#finishOperation(token, seq);
    return seq;
  }

  async flush(token: SceneWriterToken): Promise<number> {
    const document = await this.#fencedRead(token);
    if (document.activeSeq !== document.durableSeq) {
      throw new SceneLocalStorageError(
        'conflict',
        'Локальное изменение ещё не записано',
      );
    }
    return document.durableSeq;
  }

  async seal(
    token: SceneWriterToken,
    input: {
      header: MapSceneHeaderV4;
      expectedRevision: number;
      rendererVersion: number;
      renderPalette: Readonly<Record<string, string>>;
      sourceMapId?: number;
      sourceRevision?: number;
    },
  ): Promise<SceneLocalCommit> {
    const db = await openWorkshopSceneDatabase();
    const localCommitId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(token.documentKey);
      let commit: SceneLocalCommit;
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !this.#isWriter(document, token) ||
          document?.activeCommitId ||
          document?.activeSeq !== document?.durableSeq
        ) {
          tx.abort();
          return;
        }
        commit = {
          version: 2,
          documentKey: token.documentKey,
          localCommitId,
          cutSeq: document.durableSeq,
          fromSeq: document.acknowledgedSeq,
          expectedRevision: input.expectedRevision,
          ...(input.sourceMapId !== undefined
            ? { sourceMapId: input.sourceMapId }
            : {}),
          ...(input.sourceRevision !== undefined
            ? { sourceRevision: input.sourceRevision }
            : {}),
          header: input.header,
          renderPalette: input.renderPalette,
          rendererVersion: input.rendererVersion,
          state: 'preparing',
          pageCount: 0,
          tileCount: 0,
          containerCount: 0,
          totalBytes: 0,
          completedParts: 0,
          idempotencyKey: crypto.randomUUID(),
        };
        store.put({ ...document, activeCommitId: localCommitId });
        tx.objectStore('localCommits').add(commit);
      };
      tx.oncomplete = () => resolve(commit);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async readEntityAt(
    documentKey: string,
    entityType: SceneEntityType,
    entityId: string,
    cutSeq: number,
  ): Promise<SceneLocalMutation | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutations', 'readonly');
      const range = IDBKeyRange.bound(
        [documentKey, entityType, entityId, 0],
        [documentKey, entityType, entityId, cutSeq],
      );
      const request = tx
        .objectStore('mutations')
        .index('byEntity')
        .openCursor(range, 'prev');
      request.onsuccess = () =>
        resolve(
          (request.result?.value as SceneLocalMutation | undefined) ?? null,
        );
      request.onerror = () => reject(request.error);
    });
  }

  async *iterateMutations(
    documentKey: string,
    fromSeq: number,
    throughSeq: number,
  ): AsyncGenerator<SceneLocalMutation> {
    let after: IDBValidKey | undefined;
    while (true) {
      const page = await this.#mutationPage(
        documentKey,
        fromSeq,
        throughSeq,
        after,
      );
      for (const mutation of page.items) yield mutation;
      if (page.items.length < MAX_BATCH_RECORDS) return;
      after = page.lastKey;
    }
  }

  /** Entity order keeps only one entity's revisions in memory at a time. */
  async *iterateChangedEntities(
    documentKey: string,
    fromSeq: number,
    throughSeq: number,
  ): AsyncGenerator<{ first: SceneLocalMutation; latest: SceneLocalMutation }> {
    for (const entityType of ['container', 'part'] as const) {
      let after: IDBValidKey | undefined;
      let first: SceneLocalMutation | null = null;
      let latest: SceneLocalMutation | null = null;
      while (true) {
        const page = await this.#entityPage(documentKey, entityType, after);
        for (const mutation of page.items) {
          if (mutation.seq <= fromSeq || mutation.seq > throughSeq) continue;
          if (latest && latest.entityId !== mutation.entityId) {
            if (first) yield { first, latest };
            first = null;
            latest = null;
          }
          first ??= mutation;
          latest = mutation;
        }
        if (page.items.length < MAX_BATCH_RECORDS) break;
        after = page.lastKey;
      }
      if (first && latest) yield { first, latest };
    }
  }

  async acknowledge(
    token: SceneWriterToken,
    localCommitId: string,
    publishedRevision: number,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const documentStore = tx.objectStore('documents');
      const commitStore = tx.objectStore('localCommits');
      const docRequest = documentStore.get(token.documentKey);
      const commitRequest = commitStore.get([token.documentKey, localCommitId]);
      let document: SceneLocalDocument | undefined;
      let commit: SceneLocalCommit | undefined;
      let documentLoaded = false;
      let commitLoaded = false;
      const update = () => {
        if (!documentLoaded || !commitLoaded) return;
        if (!document || !commit) {
          tx.abort();
          return;
        }
        if (
          !this.#isWriter(document, token) ||
          document.activeCommitId !== localCommitId ||
          commit.state !== 'publishing' ||
          commit.expectedRevision + 1 !== publishedRevision
        ) {
          tx.abort();
          return;
        }
        documentStore.put({
          ...document,
          baseRevision: publishedRevision,
          acknowledgedSeq: commit.cutSeq,
          activeCommitId: undefined,
        });
        commitStore.put({
          ...commit,
          state: 'acknowledged',
          publishedRevision,
        });
      };
      docRequest.onsuccess = () => {
        document = docRequest.result as SceneLocalDocument | undefined;
        documentLoaded = true;
        update();
      };
      commitRequest.onsuccess = () => {
        commit = commitRequest.result as SceneLocalCommit | undefined;
        commitLoaded = true;
        update();
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #mutationPage(
    documentKey: string,
    fromSeq: number,
    throughSeq: number,
    after?: IDBValidKey,
  ) {
    const db = await openWorkshopSceneDatabase();
    return new Promise<{ items: SceneLocalMutation[]; lastKey?: IDBValidKey }>(
      (resolve, reject) => {
        const tx = db.transaction('mutations', 'readonly');
        const lower: IDBValidKey = after ?? [documentKey, fromSeq, '', ''];
        const upper: IDBValidKey = [
          documentKey,
          throughSeq,
          '\uffff',
          '\uffff',
        ];
        const request = tx
          .objectStore('mutations')
          .openCursor(IDBKeyRange.bound(lower, upper, Boolean(after)));
        const items: SceneLocalMutation[] = [];
        let lastKey: IDBValidKey | undefined;
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor || items.length === MAX_BATCH_RECORDS) return;
          items.push(cursor.value as SceneLocalMutation);
          lastKey = cursor.primaryKey;
          cursor.continue();
        };
        tx.oncomplete = () => resolve({ items, lastKey });
        tx.onabort = () => reject(storageError(tx.error));
        tx.onerror = () => reject(storageError(tx.error));
      },
    );
  }

  async #entityPage(
    documentKey: string,
    entityType: SceneEntityType,
    after?: IDBValidKey,
  ) {
    const db = await openWorkshopSceneDatabase();
    return new Promise<{ items: SceneLocalMutation[]; lastKey?: IDBValidKey }>(
      (resolve, reject) => {
        const tx = db.transaction('mutations', 'readonly');
        const lower = after ?? [documentKey, entityType, '', 0];
        const upper = [
          documentKey,
          entityType,
          '\uffff',
          Number.MAX_SAFE_INTEGER,
        ];
        const request = tx
          .objectStore('mutations')
          .index('byEntity')
          .openCursor(IDBKeyRange.bound(lower, upper, Boolean(after)));
        const items: SceneLocalMutation[] = [];
        let lastKey: IDBValidKey | undefined;
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor || items.length === MAX_BATCH_RECORDS) return;
          items.push(cursor.value as SceneLocalMutation);
          lastKey = cursor.key;
          cursor.continue();
        };
        tx.oncomplete = () => resolve({ items, lastKey });
        tx.onabort = () => reject(storageError(tx.error));
        tx.onerror = () => reject(storageError(tx.error));
      },
    );
  }

  async #beginOperation(
    token: SceneWriterToken,
    operationId: string,
    expectedRecords: number,
  ): Promise<number> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['documents', 'operations'], 'readwrite');
      const documents = tx.objectStore('documents');
      const request = documents.get(token.documentKey);
      let seq = 0;
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !this.#isWriter(document, token) ||
          document?.activeSeq !== document?.durableSeq
        ) {
          tx.abort();
          return;
        }
        seq = document.activeSeq + 1;
        documents.put({ ...document, activeSeq: seq });
        const operation: SceneLocalOperation = {
          documentKey: token.documentKey,
          seq,
          operationId,
          expectedRecords,
          status: 'writing',
        };
        tx.objectStore('operations').add(operation);
      };
      tx.oncomplete = () => resolve(seq);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #writeMutationBatch(
    token: SceneWriterToken,
    batch: readonly SceneLocalMutation[],
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'mutations'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        if (
          !this.#isWriter(
            request.result as SceneLocalDocument | undefined,
            token,
          )
        ) {
          tx.abort();
          return;
        }
        for (const mutation of batch) tx.objectStore('mutations').add(mutation);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #finishOperation(token: SceneWriterToken, seq: number): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'operations'], 'readwrite');
      const documents = tx.objectStore('documents');
      const request = documents.get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !this.#isWriter(document, token) ||
          document?.durableSeq !== seq - 1
        ) {
          tx.abort();
          return;
        }
        const operations = tx.objectStore('operations');
        const operationRequest = operations.get([token.documentKey, seq]);
        operationRequest.onsuccess = () => {
          const operation = operationRequest.result as
            | SceneLocalOperation
            | undefined;
          if (!operation || operation.status !== 'writing') {
            tx.abort();
            return;
          }
          operations.put({ ...operation, status: 'complete' });
          documents.put({ ...document, durableSeq: seq });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #discardIncomplete(token: SceneWriterToken): Promise<void> {
    const document = await this.#fencedRead(token);
    if (document.activeSeq === document.durableSeq) return;
    const seq = document.activeSeq;
    while (true) {
      const page = await this.#mutationPage(token.documentKey, seq, seq);
      if (!page.items.length) break;
      const db = await openWorkshopSceneDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['documents', 'mutations'], 'readwrite');
        const request = tx.objectStore('documents').get(token.documentKey);
        request.onsuccess = () => {
          if (
            !this.#isWriter(
              request.result as SceneLocalDocument | undefined,
              token,
            )
          ) {
            tx.abort();
            return;
          }
          const store = tx.objectStore('mutations');
          for (const mutation of page.items) {
            store.delete([
              mutation.documentKey,
              mutation.seq,
              mutation.entityType,
              mutation.entityId,
            ]);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(storageError(tx.error));
        tx.onerror = () => reject(storageError(tx.error));
      });
    }
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'operations'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        const current = request.result as SceneLocalDocument | undefined;
        if (!this.#isWriter(current, token) || current?.activeSeq !== seq) {
          tx.abort();
          return;
        }
        tx.objectStore('operations').delete([token.documentKey, seq]);
        tx.objectStore('documents').put({
          ...current,
          activeSeq: current.durableSeq,
        });
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #fencedRead(token: SceneWriterToken): Promise<SceneLocalDocument> {
    const document = await this.readDocument(token.documentKey);
    if (!document || !this.#isWriter(document, token)) {
      throw new SceneLocalStorageError(
        'writer-lost',
        'Другая вкладка редактирует эту карту',
      );
    }
    return document;
  }

  #isWriter(
    document: SceneLocalDocument | undefined,
    token: SceneWriterToken,
  ): document is SceneLocalDocument {
    return (
      document?.writerEpoch === token.epoch &&
      document.writerId === token.writerId &&
      (document.leaseUntil ?? 0) > Date.now()
    );
  }

  async #claimWriter(documentKey: string): Promise<SceneWriterToken> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(documentKey);
      let token: SceneWriterToken;
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          !document ||
          ((document.leaseUntil ?? 0) > Date.now() &&
            document.writerId !== this.#writerId)
        ) {
          tx.abort();
          return;
        }
        token = {
          documentKey,
          writerId: this.#writerId,
          epoch: document.writerEpoch + 1,
        };
        store.put({
          ...document,
          writerEpoch: token.epoch,
          writerId: token.writerId,
          leaseUntil: Date.now() + LEASE_MS,
        });
      };
      tx.oncomplete = () => resolve(token);
      tx.onabort = () =>
        reject(
          new SceneLocalStorageError(
            'writer-lost',
            'Другая вкладка редактирует эту карту',
          ),
        );
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #renewWriter(token: SceneWriterToken): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (!this.#isWriter(document, token)) {
          tx.abort();
          return;
        }
        store.put({ ...document, leaseUntil: Date.now() + LEASE_MS });
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(
          new SceneLocalStorageError(
            'writer-lost',
            'Право записи в этой вкладке истекло',
          ),
        );
      tx.onerror = () => reject(storageError(tx.error));
    });
  }

  async #releaseWriter(token: SceneWriterToken): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          document?.writerEpoch === token.epoch &&
          document.writerId === token.writerId
        ) {
          store.put({
            ...document,
            writerId: undefined,
            leaseUntil: undefined,
          });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
    });
  }
}
