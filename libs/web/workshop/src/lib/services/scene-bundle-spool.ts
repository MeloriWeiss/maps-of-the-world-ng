import { SceneBundleCodec } from './scene-bundle-codec';
import { SceneCommitStore } from './scene-commit.store';
import { openWorkshopSceneDatabase } from './workshop-scene-local-db';
import {
  SceneBundleFrame,
  SceneLocalCommit,
  SceneLocalDocument,
  ScenePartKind,
  SceneWriterToken,
} from './workshop-scene-local.types';

const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BUNDLE_BYTES = 128 * 1024 * 1024;

/** Идентификаторы документа и коммита для локального файла пакета. */
export interface SceneSpoolIdentity {
  accountId: number;
  localDocumentId: string;
  localCommitId: string;
  documentKey: string;
}

/** Проверяет идентификаторы и строит имя файла локального пакета. */
function fileName(identity: SceneSpoolIdentity, bundleId: string) {
  if (
    !Number.isSafeInteger(identity.accountId) ||
    identity.accountId < 1 ||
    !UUID.test(identity.localDocumentId) ||
    !UUID.test(identity.localCommitId) ||
    !UUID.test(bundleId)
  ) {
    throw new Error('Invalid local bundle identity');
  }
  return `${identity.accountId}-${identity.localDocumentId}-${identity.localCommitId}-${bundleId}.bundle`;
}

/**
 * Собирает бинарный пакет сцены в Origin Private File System.
 *
 * Файл является временной производной копией; источником восстановления служат
 * неизменяемые части коммита в IndexedDB.
 */
export class SceneBundleSpool {
  readonly #parts: SceneCommitStore;

  constructor(parts: SceneCommitStore) {
    this.#parts = parts;
  }

  /**
   * Собирает пакет из подготовленных частей и сохраняет его локально.
   *
   * @param token Токен эксклюзивной записи документа.
   * @param identity Идентификаторы пользователя, документа и коммита.
   * @returns Идентификатор пакета и готовый файл для отправки.
   */
  async build(
    token: SceneWriterToken,
    identity: SceneSpoolIdentity,
  ): Promise<{ bundleId: string; file: File }> {
    if (token.documentKey !== identity.documentKey)
      throw new Error('Bundle belongs to another document');

    if (!navigator.storage.getDirectory)
      throw new Error(
        'Браузер не поддерживает локальную подготовку больших карт',
      );

    const projectedBytes = await this.#projectedBytes(identity);
    const estimate = await navigator.storage.estimate();

    if (
      estimate.quota !== undefined &&
      estimate.usage !== undefined &&
      estimate.quota - estimate.usage < projectedBytes * 2
    ) {
      throw new Error('Недостаточно свободного места для подготовки карты');
    }

    const bundleId = crypto.randomUUID();
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('workshop-scene-bundles', {
      create: true,
    });
    const handle = await folder.getFileHandle(fileName(identity, bundleId), {
      create: true,
    });
    const writer = await handle.createWritable();
    let closed = false;
    let offset = 0;
    let ordinal = 0;
    let payloadBytes = 0;
    let hash = await SceneBundleCodec.initialHash();

    try {
      await writer.write(SceneBundleCodec.magic);
      offset += SceneBundleCodec.magic.byteLength;

      for (const kind of ['page', 'container', 'tile'] as const) {
        let afterOrdinal = -1;

        while (true) {
          const page = await this.#parts.listDescriptors(
            identity.documentKey,
            identity.localCommitId,
            kind,
            afterOrdinal,
          );

          for (const descriptor of page.items) {
            const part = await this.#parts.readPart(
              identity.documentKey,
              identity.localCommitId,
              kind,
              descriptor.partKey,
            );
            if (
              !part ||
              part.digest !== descriptor.digest ||
              part.byteLength !== descriptor.byteLength
            ) {
              throw new Error(
                'Prepared map part changed during bundle creation',
              );
            }

            const payload = part.deleted
              ? new Uint8Array()
              : part.png
                ? new Uint8Array(await part.png.arrayBuffer())
                : encoder.encode(part.body ?? '');

            const frame = await SceneBundleCodec.data(
              {
                kind: part.deleted ? 'empty' : kind,
                ...(part.deleted ? { targetKind: kind } : {}),
                ordinal,
                partKey: descriptor.partKey,
                ...(descriptor.cellX !== undefined
                  ? { cellX: descriptor.cellX }
                  : {}),
                ...(descriptor.cellY !== undefined
                  ? { cellY: descriptor.cellY }
                  : {}),
                ...(descriptor.pageId !== undefined
                  ? { pageId: descriptor.pageId }
                  : {}),
                ...(descriptor.level !== undefined
                  ? { level: descriptor.level }
                  : {}),
                ...(descriptor.x !== undefined ? { x: descriptor.x } : {}),
                ...(descriptor.y !== undefined ? { y: descriptor.y } : {}),
              },
              payload,
              hash,
            );

            if (frame.metadata.digest !== part.digest)
              throw new Error('Prepared map part digest is invalid');
            if (offset + frame.bytes.byteLength > MAX_BUNDLE_BYTES)
              throw new Error('Пакет карты превышает лимит');

            await writer.write(frame.bytes);
            await this.#recordFrame(token, {
              documentKey: identity.documentKey,
              localCommitId: identity.localCommitId,
              bundleId,
              ordinal,
              offset,
              byteLength: frame.bytes.byteLength,
              prefixHash: SceneBundleCodec.hashHex(frame.hash),
              kind,
              partKey: descriptor.partKey,
            });

            offset += frame.bytes.byteLength;
            payloadBytes += payload.byteLength;
            hash = frame.hash;
            ordinal++;
          }

          if (page.nextKey === undefined) break;
          afterOrdinal = Number(page.nextKey);
        }
      }

      const terminal = SceneBundleCodec.terminal(ordinal, payloadBytes, hash);
      if (offset + terminal.byteLength > MAX_BUNDLE_BYTES)
        throw new Error('Пакет карты превышает лимит');
      await writer.write(terminal);
      await writer.close();
      closed = true;

      const file = await handle.getFile();
      await this.#markReady(
        token,
        identity.localCommitId,
        bundleId,
        ordinal,
        payloadBytes,
        SceneBundleCodec.hashHex(hash),
      );
      return { bundleId, file };
    } finally {
      if (!closed) await writer.abort().catch(() => undefined);
    }
  }

  /** Открывает ранее созданный пакет сцены в локальном файловом хранилище. */
  async open(identity: SceneSpoolIdentity, bundleId: string): Promise<File> {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('workshop-scene-bundles');
    return (await folder.getFileHandle(fileName(identity, bundleId))).getFile();
  }

  /** Оценивает полный размер пакета до создания файла в локальном хранилище. */
  async #projectedBytes(identity: SceneSpoolIdentity): Promise<number> {
    let bytes = SceneBundleCodec.magic.byteLength + 4096;
    let frames = 0;
    for (const kind of ['page', 'container', 'tile'] as const) {
      let afterOrdinal = -1;
      while (true) {
        const page = await this.#parts.listDescriptors(
          identity.documentKey,
          identity.localCommitId,
          kind,
          afterOrdinal,
        );
        for (const descriptor of page.items) {
          bytes += descriptor.byteLength + 4104;
          frames++;
          if (bytes > MAX_BUNDLE_BYTES || frames > 100_000)
            throw new Error('Пакет карты превышает лимит');
        }
        if (page.nextKey === undefined) break;
        afterOrdinal = Number(page.nextKey);
      }
    }
    return bytes;
  }

  /** Возвращает контрольную запись кадра из локальной базы данных. */
  async readFrame(
    documentKey: string,
    localCommitId: string,
    bundleId: string,
    ordinal: number,
  ): Promise<SceneBundleFrame | null> {
    const db = await openWorkshopSceneDatabase();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction('bundleFrames', 'readonly')
        .objectStore('bundleFrames')
        .get([documentKey, localCommitId, bundleId, ordinal]);
      request.onsuccess = () =>
        resolve((request.result as SceneBundleFrame | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Атомарно сохраняет контрольную запись кадра под текущим токеном записи. */
  async #recordFrame(
    token: SceneWriterToken,
    frame: SceneBundleFrame,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'bundleFrames'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        const doc = request.result as SceneLocalDocument | undefined;
        if (
          doc?.writerId !== token.writerId ||
          doc.writerEpoch !== token.epoch ||
          (doc.leaseUntil ?? 0) <= Date.now()
        ) {
          tx.abort();
          return;
        }
        tx.objectStore('bundleFrames').add(frame);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error('Bundle frame checkpoint failed'));
      tx.onerror = () =>
        reject(tx.error ?? new Error('Bundle frame checkpoint failed'));
    });
  }

  /** Записывает манифест готового файла после успешной сборки и закрытия потока. */
  async #markReady(
    token: SceneWriterToken,
    localCommitId: string,
    bundleId: string,
    frameCount: number,
    payloadBytes: number,
    digest: string,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        const doc = request.result as SceneLocalDocument | undefined;
        if (
          doc?.writerId !== token.writerId ||
          doc.writerEpoch !== token.epoch ||
          (doc.leaseUntil ?? 0) <= Date.now()
        ) {
          tx.abort();
          return;
        }

        const commits = tx.objectStore('localCommits');
        const commitRequest = commits.get([token.documentKey, localCommitId]);
        commitRequest.onsuccess = () => {
          const commit = commitRequest.result as SceneLocalCommit | undefined;

          if (!commit || commit.state !== 'ready' || commit.bundleReady) {
            tx.abort();
            return;
          }

          commits.put({
            ...commit,
            bundleId,
            bundleReady: true,
            preparationStage: 'bundle',
            bundleFrameCount: frameCount,
            bundlePayloadBytes: payloadBytes,
            bundleDigest: digest,
          });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error('Bundle was not marked ready'));
      tx.onerror = () =>
        reject(tx.error ?? new Error('Bundle was not marked ready'));
    });
  }
}
