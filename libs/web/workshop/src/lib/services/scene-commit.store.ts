import { openWorkshopSceneDatabase } from './workshop-scene-local-db';
import { SceneDraftRepository } from './scene-draft.repository';
import {
  SceneCommitPhase,
  SceneCursorPage,
  SceneLocalCommit,
  SceneLocalPart,
  SceneLocalPartDescriptor,
  SceneLocalStorageError,
  SceneLocalWork,
  ScenePartKind,
  SceneUploadReceipt,
  SceneWriterToken,
} from './workshop-scene-local.types';

const encoder = new TextEncoder();
const PAGE_BYTES = 256 * 1024;
const PNG_BYTES = 350_000;
const MAX_CURSOR_PAGE = 16;

/** Преобразует ошибку IndexedDB в понятную ошибку локального хранилища. */
function asFailure(error: DOMException | null): Error {
  if (error?.name === 'QuotaExceededError') {
    return new SceneLocalStorageError(
      'quota',
      'Недостаточно места для подготовки карты',
    );
  }
  return error ?? new Error('Не удалось сохранить подготовленную часть карты');
}

/** Проверяет, что блокировка документа принадлежит актуальному писателю. */
function isCurrentWriter(
  document:
    | { writerEpoch: number; writerId?: string; leaseUntil?: number }
    | undefined,
  token: SceneWriterToken,
): boolean {
  return (
    document?.writerEpoch === token.epoch &&
    document.writerId === token.writerId &&
    (document.leaseUntil ?? 0) > Date.now()
  );
}

/**
 * Хранит подготовленные части локального коммита сцены.
 *
 * Данные и индексные описания записываются раздельно, а перечисления читают
 * только описания, чтобы не загружать весь коммит в память.
 */
export class SceneCommitStore {
  readonly #drafts: SceneDraftRepository;

  constructor(drafts: SceneDraftRepository) {
    this.#drafts = drafts;
  }

  /** Читает манифест локального коммита. */
  async readManifest(
    documentKey: string,
    localCommitId: string,
  ): Promise<SceneLocalCommit | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('localCommits', 'readonly');
      const request = tx
        .objectStore('localCommits')
        .get([documentKey, localCommitId]);
      request.onsuccess = () =>
        resolve((request.result as SceneLocalCommit | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Возвращает активный незавершённый коммит документа, если он есть. */
  async pending(documentKey: string): Promise<SceneLocalCommit | null> {
    const document = await this.#drafts.readDocument(documentKey);
    if (!document?.activeCommitId) return null;
    return this.readManifest(documentKey, document.activeCommitId);
  }

  /** Записывает задачу подготовки коммита под блокировкой документа. */
  async putWork(token: SceneWriterToken, work: SceneLocalWork): Promise<void> {
    this.#sameDocument(token, work.documentKey);
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'commitWork'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        if (!isCurrentWriter(request.result, token)) {
          tx.abort();
          return;
        }
        tx.objectStore('commitWork').put(work);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /**
   * Атомарно сохраняет часть коммита и контрольную точку задачи.
   *
   * Повторная запись уже сохранённой части допустима только с теми же
   * контрольной суммой, размером и порядковым номером.
   */
  async writePartAndCheckpoint(
    token: SceneWriterToken,
    part: SceneLocalPart,
    completedWork?: SceneLocalWork,
  ): Promise<void> {
    this.#sameDocument(token, part.documentKey);
    if (
      completedWork &&
      (completedWork.documentKey !== part.documentKey ||
        completedWork.localCommitId !== part.localCommitId ||
        completedWork.status !== 'complete')
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Checkpoint не соответствует части сохранения',
      );
    }

    this.#validatePart(part);

    const descriptor: SceneLocalPartDescriptor = {
      documentKey: part.documentKey,
      localCommitId: part.localCommitId,
      kind: part.kind,
      partKey: part.partKey,
      ordinal: part.ordinal,
      byteLength: part.byteLength,
      digest: part.digest,
      ...(part.cellX !== undefined ? { cellX: part.cellX } : {}),
      ...(part.cellY !== undefined ? { cellY: part.cellY } : {}),
      ...(part.pageId !== undefined ? { pageId: part.pageId } : {}),
      ...(part.minX !== undefined ? { minX: part.minX } : {}),
      ...(part.minY !== undefined ? { minY: part.minY } : {}),
      ...(part.maxX !== undefined ? { maxX: part.maxX } : {}),
      ...(part.maxY !== undefined ? { maxY: part.maxY } : {}),
      ...(part.level !== undefined ? { level: part.level } : {}),
      ...(part.x !== undefined ? { x: part.x } : {}),
      ...(part.y !== undefined ? { y: part.y } : {}),
      ...(part.deleted !== undefined ? { deleted: part.deleted } : {}),
    };

    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [
          'documents',
          'localCommits',
          'commitParts',
          'commitPartDescriptors',
          'commitWork',
        ],
        'readwrite',
      );
      const docRequest = tx.objectStore('documents').get(token.documentKey);
      docRequest.onsuccess = () => {
        if (!isCurrentWriter(docRequest.result, token)) {
          tx.abort();
          return;
        }

        const commits = tx.objectStore('localCommits');
        const commitRequest = commits.get([
          part.documentKey,
          part.localCommitId,
        ]);
        commitRequest.onsuccess = () => {
          const commit = commitRequest.result as SceneLocalCommit | undefined;
          if (!commit || commit.state !== 'preparing') {
            tx.abort();
            return;
          }

          const parts = tx.objectStore('commitParts');
          const existingRequest = parts.get([
            part.documentKey,
            part.localCommitId,
            part.kind,
            part.partKey,
          ]);
          existingRequest.onsuccess = () => {
            const existing = existingRequest.result as
              | SceneLocalPart
              | undefined;
            if (
              existing &&
              (existing.digest !== part.digest ||
                existing.byteLength !== part.byteLength ||
                existing.ordinal !== part.ordinal)
            ) {
              tx.abort();
              return;
            }

            if (!existing) {
              parts.add(part);
              tx.objectStore('commitPartDescriptors').add(descriptor);
              commits.put({
                ...commit,
                completedParts: commit.completedParts + 1,
                totalBytes: commit.totalBytes + part.byteLength,
                pageCount: commit.pageCount + (part.kind === 'page' ? 1 : 0),
                tileCount: commit.tileCount + (part.kind === 'tile' ? 1 : 0),
                containerCount:
                  commit.containerCount + (part.kind === 'container' ? 1 : 0),
              });
            }
            if (completedWork) tx.objectStore('commitWork').put(completedWork);
          };
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Читает подготовленную часть коммита по её ключу. */
  async readPart(
    documentKey: string,
    localCommitId: string,
    kind: ScenePartKind,
    partKey: string,
  ): Promise<SceneLocalPart | null> {
    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitParts', 'readonly');
      const request = tx
        .objectStore('commitParts')
        .get([documentKey, localCommitId, kind, partKey]);
      request.onsuccess = () =>
        resolve((request.result as SceneLocalPart | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Перечисляет описания частей коммита после заданного порядкового номера. */
  async listDescriptors(
    documentKey: string,
    localCommitId: string,
    kind: ScenePartKind,
    afterOrdinal = -1,
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneCursorPage<SceneLocalPartDescriptor>> {
    if (limit < 1 || limit > MAX_CURSOR_PAGE) {
      throw new RangeError('Invalid cursor page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitPartDescriptors', 'readonly');
      const lower = [documentKey, localCommitId, kind, afterOrdinal];
      const upper = [documentKey, localCommitId, kind, Number.MAX_SAFE_INTEGER];
      const request = tx
        .objectStore('commitPartDescriptors')
        .openCursor(IDBKeyRange.bound(lower, upper, true));

      const items: SceneLocalPartDescriptor[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length === limit) return;

        items.push(cursor.value as SceneLocalPartDescriptor);
        cursor.continue();
      };
      tx.oncomplete = () =>
        resolve({
          items,
          ...(items.length === limit
            ? { nextKey: items[items.length - 1].ordinal }
            : {}),
        });
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Перечисляет задачи подготовки коммита после указанного ключа. */
  async listWork(
    documentKey: string,
    localCommitId: string,
    afterKey = '',
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneCursorPage<SceneLocalWork>> {
    if (limit < 1 || limit > MAX_CURSOR_PAGE) {
      throw new RangeError('Invalid cursor page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitWork', 'readonly');
      const request = tx
        .objectStore('commitWork')
        .openCursor(
          IDBKeyRange.bound(
            [documentKey, localCommitId, afterKey],
            [documentKey, localCommitId, '\uffff'],
            true,
          ),
        );

      const items: SceneLocalWork[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length === limit) return;

        items.push(cursor.value as SceneLocalWork);
        cursor.continue();
      };
      tx.oncomplete = () =>
        resolve({
          items,
          ...(items.length === limit
            ? { nextKey: items[items.length - 1].taskKey }
            : {}),
        });
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Атомарно сохраняет пакет задач подготовки одного коммита. */
  async putWorks(
    token: SceneWriterToken,
    works: readonly SceneLocalWork[],
  ): Promise<void> {
    if (
      !works.length ||
      works.length > 128 ||
      works.some(
        (work) =>
          work.documentKey !== token.documentKey ||
          work.localCommitId !== works[0].localCommitId,
      )
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Неверный пакет локальных записей',
      );
    }

    const db = await openWorkshopSceneDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['documents', 'localCommits', 'commitWork'],
        'readwrite',
      );
      const document = tx.objectStore('documents').get(token.documentKey);
      document.onsuccess = () => {
        if (!isCurrentWriter(document.result, token)) {
          tx.abort();
          return;
        }

        const commit = tx
          .objectStore('localCommits')
          .get([token.documentKey, works[0].localCommitId]);
        commit.onsuccess = () => {
          if (
            (commit.result as SceneLocalCommit | undefined)?.state !==
            'preparing'
          ) {
            tx.abort();
            return;
          }

          const workStore = tx.objectStore('commitWork');
          for (const work of works) workStore.put(work);
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Читает задачу подготовки коммита по её ключу. */
  async readWork(
    documentKey: string,
    localCommitId: string,
    taskKey: string,
  ): Promise<SceneLocalWork | null> {
    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction('commitWork', 'readonly')
        .objectStore('commitWork')
        .get([documentKey, localCommitId, taskKey]);
      request.onsuccess = () =>
        resolve((request.result as SceneLocalWork | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Перечисляет задачи, ключи которых начинаются с указанного префикса. */
  async listWorkPrefix(
    documentKey: string,
    localCommitId: string,
    prefix: string,
    afterKey = '',
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneLocalWork[]> {
    if (limit < 1 || limit > MAX_CURSOR_PAGE)
      throw new RangeError('Invalid cursor page size');
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitWork', 'readonly');
      const request = tx
        .objectStore('commitWork')
        .openCursor(
          IDBKeyRange.bound(
            [documentKey, localCommitId, afterKey || prefix],
            [documentKey, localCommitId, `${prefix}\uffff`],
            Boolean(afterKey),
          ),
        );
      const items: SceneLocalWork[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length === limit) return;
        items.push(cursor.value as SceneLocalWork);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(items);
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Перечисляет задачи фигур, относящиеся к заданной ячейке карты. */
  async listFinalCell(
    documentKey: string,
    localCommitId: string,
    cellX: number,
    cellY: number,
    afterPartId = '',
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneLocalWork[]> {
    return this.#listIndex(
      'byFinalCell',
      IDBKeyRange.bound(
        [documentKey, localCommitId, cellX, cellY, afterPartId],
        [documentKey, localCommitId, cellX, cellY, '\uffff'],
        Boolean(afterPartId),
      ),
      limit,
    );
  }

  /** Перечисляет итоговые задачи коммита в порядке их сохранения. */
  async listFinalOrder(
    documentKey: string,
    localCommitId: string,
    afterKey?: IDBValidKey,
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneCursorPage<SceneLocalWork>> {
    if (limit < 1 || limit > MAX_CURSOR_PAGE) {
      throw new RangeError('Invalid cursor page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitWork', 'readonly');
      const request = tx
        .objectStore('commitWork')
        .index('byFinalOrder')
        .openCursor(
          IDBKeyRange.lowerBound(
            afterKey ?? [documentKey, localCommitId],
            afterKey !== undefined,
          ),
        );

      const items: SceneLocalWork[] = [];
      let lastKey: IDBValidKey | undefined;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length === limit) return;

        const work = cursor.value as SceneLocalWork;
        if (
          work.documentKey !== documentKey ||
          work.localCommitId !== localCommitId
        )
          return;
        items.push(work);
        lastKey = cursor.key;
        cursor.continue();
      };
      tx.oncomplete = () =>
        resolve({
          items,
          ...(items.length === limit ? { nextKey: lastKey } : {}),
        });
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Перечисляет листья превью для заданной позиции и уровня. */
  async listPreviewLeaf(
    documentKey: string,
    localCommitId: string,
    level: number,
    x: number,
    y: number,
    afterRank = -1,
    limit = MAX_CURSOR_PAGE,
  ): Promise<SceneLocalWork[]> {
    return this.#listIndex(
      'byPreviewLeaf',
      IDBKeyRange.bound(
        [documentKey, localCommitId, level, x, y, afterRank + 1, ''],
        [
          documentKey,
          localCommitId,
          level,
          x,
          y,
          Number.MAX_SAFE_INTEGER,
          '\uffff',
        ],
      ),
      limit,
    );
  }

  /** Читает ограниченную страницу задач через выбранный индекс IndexedDB. */
  async #listIndex(
    indexName: string,
    range: IDBKeyRange,
    limit: number,
  ): Promise<SceneLocalWork[]> {
    if (limit < 1 || limit > MAX_CURSOR_PAGE) {
      throw new RangeError('Invalid cursor page size');
    }

    const db = await openWorkshopSceneDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('commitWork', 'readonly');
      const request = tx
        .objectStore('commitWork')
        .index(indexName)
        .openCursor(range);

      const items: SceneLocalWork[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.length === limit) return;

        items.push(cursor.value as SceneLocalWork);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(items);
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Помечает задачу подготовки завершённой, если коммит ещё готовится. */
  async completeWork(
    token: SceneWriterToken,
    work: SceneLocalWork,
  ): Promise<void> {
    this.#sameDocument(token, work.documentKey);
    if (work.status !== 'complete') {
      throw new SceneLocalStorageError('invalid-part', 'Неверный checkpoint');
    }

    const db = await openWorkshopSceneDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['documents', 'localCommits', 'commitWork'],
        'readwrite',
      );
      const doc = tx.objectStore('documents').get(token.documentKey);
      doc.onsuccess = () => {
        if (!isCurrentWriter(doc.result, token)) {
          tx.abort();
          return;
        }

        const commit = tx
          .objectStore('localCommits')
          .get([work.documentKey, work.localCommitId]);
        commit.onsuccess = () => {
          if (
            (commit.result as SceneLocalCommit | undefined)?.state !==
            'preparing'
          ) {
            tx.abort();
            return;
          }

          tx.objectStore('commitWork').put(work);
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Атомарно сохраняет ссылки превью и контрольную точку их генерации. */
  async writeLinksAndCheckpoint(
    token: SceneWriterToken,
    localCommitId: string,
    links: readonly SceneLocalWork[],
    checkpoint: SceneLocalWork,
  ): Promise<void> {
    if (
      links.length > 128 ||
      checkpoint.documentKey !== token.documentKey ||
      checkpoint.localCommitId !== localCommitId ||
      checkpoint.kind !== 'checkpoint' ||
      links.some(
        (link) =>
          link.kind !== 'preview-link' ||
          link.documentKey !== token.documentKey ||
          link.localCommitId !== localCommitId ||
          link.level !== 0 ||
          link.partId === undefined ||
          link.rank === undefined,
      )
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Неверный пакет ссылок превью',
      );
    }

    const wireBytes = links.reduce(
      (sum, link) => sum + encoder.encode(JSON.stringify(link)).byteLength,
      0,
    );

    if (wireBytes > 64 * 1024) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Пакет ссылок слишком велик',
      );
    }

    const db = await openWorkshopSceneDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['documents', 'localCommits', 'commitWork'],
        'readwrite',
      );
      const document = tx.objectStore('documents').get(token.documentKey);
      document.onsuccess = () => {
        if (!isCurrentWriter(document.result, token)) {
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
            !commit.dependenciesComplete
          ) {
            tx.abort();
            return;
          }

          const workStore = tx.objectStore('commitWork');
          const count = (commit.linkCount ?? 0) + links.length;
          const bytes = (commit.linkBytes ?? 0) + wireBytes;
          if (count > 1_000_000 || bytes > 64 * 1024 * 1024) {
            tx.abort();
            return;
          }

          for (const link of links) workStore.add(link);
          commits.put({
            ...commit,
            linkCount: count,
            linkBytes: bytes,
            preparationStage: 'links',
          });
          workStore.put(checkpoint);
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Переводит коммит в состояние готовности после завершения всех этапов. */
  async markReady(
    token: SceneWriterToken,
    localCommitId: string,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['documents', 'localCommits', 'commitWork'],
        'readwrite',
      );
      const docRequest = tx.objectStore('documents').get(token.documentKey);
      docRequest.onsuccess = () => {
        if (!isCurrentWriter(docRequest.result, token)) {
          tx.abort();
          return;
        }
        const commitStore = tx.objectStore('localCommits');
        const commitRequest = commitStore.get([
          token.documentKey,
          localCommitId,
        ]);
        const countRequest = tx
          .objectStore('commitWork')
          .index('byStatus')
          .count([token.documentKey, localCommitId, 'pending']);
        const workStore = tx.objectStore('commitWork');
        const requiredStages = [
          'checkpoint:pages',
          'checkpoint:links',
          'checkpoint:previews',
        ];

        const stages = new Map<string, boolean>();
        for (const stage of requiredStages) {
          const request = workStore.get([
            token.documentKey,
            localCommitId,
            stage,
          ]);
          request.onsuccess = () => {
            const work = request.result as SceneLocalWork | undefined;
            stages.set(stage, work?.status === 'complete');
            update();
          };
        }

        let commit: SceneLocalCommit | undefined;
        let pending: number | undefined;
        let commitLoaded = false;

        const update = () => {
          if (
            !commitLoaded ||
            pending === undefined ||
            stages.size !== requiredStages.length
          )
            return;
          if (
            !commit ||
            commit.state !== 'preparing' ||
            !commit.dependenciesComplete ||
            pending > 0 ||
            requiredStages.some((stage) => !stages.get(stage))
          ) {
            tx.abort();
            return;
          }
          commitStore.put({ ...commit, state: 'ready' });
        };
        commitRequest.onsuccess = () => {
          commit = commitRequest.result as SceneLocalCommit | undefined;
          commitLoaded = true;
          update();
        };
        countRequest.onsuccess = () => {
          pending = countRequest.result;
          update();
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Обновляет этап публикации и дополнительные поля коммита. */
  async setPhase(
    token: SceneWriterToken,
    localCommitId: string,
    phase: SceneCommitPhase,
    patch: Partial<
      Pick<
        SceneLocalCommit,
        'serverCommitId' | 'attemptId' | 'idempotencyKey' | 'publishedRevision'
      >
    > = {},
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const docRequest = tx.objectStore('documents').get(token.documentKey);
      docRequest.onsuccess = () => {
        if (!isCurrentWriter(docRequest.result, token)) {
          tx.abort();
          return;
        }

        const store = tx.objectStore('localCommits');
        const request = store.get([token.documentKey, localCommitId]);
        request.onsuccess = () => {
          const commit = request.result as SceneLocalCommit | undefined;
          if (!commit || commit.state === 'acknowledged') {
            tx.abort();
            return;
          }

          store.put({ ...commit, ...patch, state: phase });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Сохраняет подтверждение отправки части коммита на сервер. */
  async recordReceipt(
    token: SceneWriterToken,
    receipt: SceneUploadReceipt,
  ): Promise<void> {
    this.#sameDocument(token, receipt.documentKey);
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'uploadReceipts'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        if (!isCurrentWriter(request.result, token)) {
          tx.abort();
          return;
        }
        tx.objectStore('uploadReceipts').put(receipt);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(asFailure(tx.error));
      tx.onerror = () => reject(asFailure(tx.error));
    });
  }

  /** Проверяет, совпадает ли сохранённое подтверждение с контрольной суммой. */
  async hasReceipt(receipt: SceneUploadReceipt): Promise<boolean> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadReceipts', 'readonly');
      const request = tx
        .objectStore('uploadReceipts')
        .get([
          receipt.documentKey,
          receipt.localCommitId,
          receipt.attemptId,
          receipt.kind,
          receipt.partKey,
        ]);
      request.onsuccess = () => {
        const saved = request.result as SceneUploadReceipt | undefined;
        resolve(saved?.digest === receipt.digest);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** Завершает публикацию и продвигает локальный документ на новую ревизию. */
  async completePublication(
    token: SceneWriterToken,
    localCommitId: string,
    publishedRevision: number,
  ): Promise<void> {
    await this.#drafts.acknowledge(token, localCommitId, publishedRevision);
  }

  /** Проверяет, что операция относится к документу токена записи. */
  #sameDocument(token: SceneWriterToken, documentKey: string) {
    if (token.documentKey !== documentKey) {
      throw new SceneLocalStorageError(
        'writer-lost',
        'Изменение относится к другой карте',
      );
    }
  }

  /** Проверяет поля, размер и содержимое части перед записью коммита. */
  #validatePart(part: SceneLocalPart) {
    const safeInteger = (value: number | undefined): value is number =>
      typeof value === 'number' && Number.isSafeInteger(value);
    const finite = (value: number | undefined): value is number =>
      typeof value === 'number' && Number.isFinite(value);

    if (
      !part.partKey ||
      !Number.isSafeInteger(part.ordinal) ||
      part.ordinal < 0 ||
      !part.digest ||
      (part.body !== undefined && part.png !== undefined)
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Неверная часть сохранения',
      );
    }

    if (
      part.kind === 'page' &&
      (!safeInteger(part.cellX) ||
        !safeInteger(part.cellY) ||
        !safeInteger(part.pageId) ||
        part.pageId < 0 ||
        part.body === undefined ||
        !finite(part.minX) ||
        !finite(part.minY) ||
        !finite(part.maxX) ||
        !finite(part.maxY) ||
        part.minX >= part.maxX ||
        part.minY >= part.maxY)
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Неверные границы страницы карты',
      );
    }

    const actual = part.png?.size ?? encoder.encode(part.body ?? '').byteLength;
    const limit = part.kind === 'tile' ? PNG_BYTES : PAGE_BYTES;
    if (
      part.byteLength !== actual ||
      actual > limit ||
      (part.kind === 'tile' && !part.deleted && part.png === undefined)
    ) {
      throw new SceneLocalStorageError(
        'invalid-part',
        'Часть сохранения превышает допустимый размер',
      );
    }
  }
}
