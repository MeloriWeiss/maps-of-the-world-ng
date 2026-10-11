import { MapSceneHeaderV4 } from '@wm/shared/workshop';
import { SceneBundleCodec } from './scene-bundle-codec';
import { SceneSaveSnapshot } from './scene-save-snapshot';
import { openWorkshopSceneDatabase } from './workshop-scene-local-db';
import {
  SceneLocalCommit,
  SceneLocalDocument,
  SceneWriterToken,
} from './workshop-scene-local.types';

const encoder = new TextEncoder();
const MAX_INTENT_BYTES = 16 * 1024 * 1024;
const MAX_INTENT_FRAMES = 100_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SceneIntentHeader {
  expectedRevision: number;
  sourceMapId?: number;
  sourceRevision?: number;
  rendererVersion: number;
  mapName: string;
  mapDescription?: string;
  scene: MapSceneHeaderV4;
}

/** Streams the fixed mutation cut into a small binary intent file. */
export class SceneIntentSpool {
  async build(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    header: SceneIntentHeader,
  ): Promise<{ intentId: string; file: File; digest: string }> {
    if (
      token.documentKey !== snapshot.documentKey ||
      !UUID.test(snapshot.localCommitId)
    ) {
      throw new Error('Intent belongs to another document');
    }
    const [accountId, localDocumentId, extra] = snapshot.documentKey.split(':');
    if (
      extra !== undefined ||
      !Number.isSafeInteger(Number(accountId)) ||
      Number(accountId) < 1 ||
      !UUID.test(localDocumentId)
    )
      throw new Error('Invalid intent document key');
    if (!navigator.storage.getDirectory)
      throw new Error('Браузер не поддерживает подготовку карты');
    const intentId = crypto.randomUUID();
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('workshop-scene-bundles', {
      create: true,
    });
    const handle = await folder.getFileHandle(
      `intent-${accountId}-${localDocumentId}-${snapshot.localCommitId}-${intentId}.bundle`,
      { create: true },
    );
    const writer = await handle.createWritable();
    let closed = false;
    let bytes = SceneBundleCodec.magic.byteLength;
    let ordinal = 0;
    let payloadBytes = 0;
    let hash = await SceneBundleCodec.initialHash();
    try {
      await writer.write(SceneBundleCodec.magic);
      const write = async (
        partKey: string,
        payload: Uint8Array,
        fields: object = {},
      ) => {
        const frame = await SceneBundleCodec.data(
          { kind: 'intent', ordinal, partKey, ...fields },
          payload,
          hash,
        );
        if (
          bytes + frame.bytes.byteLength + 256 > MAX_INTENT_BYTES ||
          ordinal >= MAX_INTENT_FRAMES
        ) {
          throw new Error('Описание изменений карты превышает лимит');
        }
        await writer.write(frame.bytes);
        bytes += frame.bytes.byteLength;
        payloadBytes += payload.byteLength;
        hash = frame.hash;
        ordinal++;
      };
      await write('scene-header', encoder.encode(JSON.stringify(header)));
      for await (const change of snapshot.changes()) {
        const first = change.first;
        const latest = change.latest;
        if (
          first.entityType !== latest.entityType ||
          first.entityId !== latest.entityId
        ) {
          throw new Error('Mutation group is inconsistent');
        }
        const payload = latest.deleted
          ? new Uint8Array()
          : encoder.encode(latest.body ?? '');
        if (!latest.deleted && !latest.body)
          throw new Error('Intent postimage is missing');
        await write(`${latest.entityType}:${latest.entityId}`, payload, {
          entityType: latest.entityType,
          entityId: latest.entityId,
          ...(latest.objectId ? { objectId: latest.objectId } : {}),
          ...(latest.instanceId ? { instanceId: latest.instanceId } : {}),
          ...(first.oldCell ? { oldCell: first.oldCell } : {}),
          ...(latest.newCell ? { newCell: latest.newCell } : {}),
          ...(first.oldBounds ? { oldBounds: first.oldBounds } : {}),
          ...(latest.newBounds ? { newBounds: latest.newBounds } : {}),
          deleted: latest.deleted,
        });
      }
      const terminal = SceneBundleCodec.terminal(ordinal, payloadBytes, hash);
      if (bytes + terminal.byteLength > MAX_INTENT_BYTES)
        throw new Error('Описание изменений карты превышает лимит');
      await writer.write(terminal);
      await writer.close();
      closed = true;
      const digest = SceneBundleCodec.hashHex(hash);
      const file = await handle.getFile();
      await this.#markReady(
        token,
        snapshot.localCommitId,
        intentId,
        digest,
        ordinal,
      );
      return { intentId, file, digest };
    } finally {
      if (!closed) await writer.abort().catch(() => undefined);
    }
  }

  async #markReady(
    token: SceneWriterToken,
    localCommitId: string,
    intentId: string,
    digest: string,
    frameCount: number,
  ): Promise<void> {
    const db = await openWorkshopSceneDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['documents', 'localCommits'], 'readwrite');
      const request = tx.objectStore('documents').get(token.documentKey);
      request.onsuccess = () => {
        const document = request.result as SceneLocalDocument | undefined;
        if (
          document?.writerId !== token.writerId ||
          document.writerEpoch !== token.epoch ||
          (document.leaseUntil ?? 0) <= Date.now()
        ) {
          tx.abort();
          return;
        }
        const commits = tx.objectStore('localCommits');
        const commitRequest = commits.get([token.documentKey, localCommitId]);
        commitRequest.onsuccess = () => {
          const commit = commitRequest.result as SceneLocalCommit | undefined;
          if (!commit || commit.state !== 'preparing' || commit.intentReady) {
            tx.abort();
            return;
          }
          commits.put({
            ...commit,
            intentId,
            intentDigest: digest,
            intentFrameCount: frameCount,
            intentReady: true,
            preparationStage: 'dependencies',
          });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error('Intent checkpoint failed'));
      tx.onerror = () =>
        reject(tx.error ?? new Error('Intent checkpoint failed'));
    });
  }
}
