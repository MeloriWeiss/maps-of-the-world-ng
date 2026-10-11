import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isMapSceneHeaderV4, MapSceneHeaderV4 } from '@wm/shared/workshop';
import { PreparedSceneCommit } from './scene-commit.types';
import { WorkshopSceneDraftStore } from './workshop-scene-draft.store';
import { SceneBundleCodec } from './scene-bundle-codec';

interface CommitStatus {
  id: string;
  status: string;
  revision?: number;
}
const encoder = new TextEncoder();

async function sceneBundle(
  commit: PreparedSceneCommit,
): Promise<{ file: Blob; hash: string; count: number }> {
  const parts: BlobPart[] = [SceneBundleCodec.magic];
  let hash = await SceneBundleCodec.initialHash();
  let count = 0;
  let payloadBytes = 0;
  let wireBytes = SceneBundleCodec.magic.byteLength;
  const append = async (
    input: Parameters<typeof SceneBundleCodec.data>[0],
    payload: Uint8Array,
  ) => {
    const frame = await SceneBundleCodec.data(input, payload, hash);
    parts.push(frame.bytes);
    hash = frame.hash;
    count++;
    payloadBytes += payload.byteLength;
    wireBytes += frame.bytes.byteLength;
    if (
      count > 10_000 ||
      payloadBytes > 256 * 1024 * 1024 ||
      wireBytes > 270 * 1024 * 1024
    )
      throw new Error('Сохранение карты превысило размер одного пакета');
  };
  for (const page of commit.pages) {
    await append(
      {
        kind: 'page',
        ordinal: count,
        partKey: `${page.cellX}:${page.cellY}:${page.pageId}`,
        cellX: page.cellX,
        cellY: page.cellY,
        pageId: page.pageId,
        minX: page.minX,
        minY: page.minY,
        maxX: page.maxX,
        maxY: page.maxY,
        deleted: page.deleted ?? false,
      },
      encoder.encode(page.body),
    );
  }
  for (const tile of commit.tiles) {
    if (!(tile.png instanceof Blob) || tile.png.size > 350_000)
      throw new Error('Invalid prepared map preview');
    await append(
      {
        kind: 'tile',
        ordinal: count,
        partKey: `${tile.level}:${tile.x}:${tile.y}`,
        level: tile.level,
        x: tile.x,
        y: tile.y,
      },
      new Uint8Array(await tile.png.arrayBuffer()),
    );
  }
  const terminal = SceneBundleCodec.terminal(count, payloadBytes, hash);
  parts.push(terminal);
  wireBytes += terminal.byteLength;
  if (wireBytes > 270 * 1024 * 1024)
    throw new Error('Сохранение карты превысило размер одного пакета');
  return {
    file: new Blob(parts, { type: SceneBundleCodec.contentType }),
    hash: SceneBundleCodec.hashHex(hash),
    count,
  };
}

@Injectable({ providedIn: 'root' })
export class WorkshopSceneCommitCoordinator {
  #http = inject(HttpClient);
  #store = new WorkshopSceneDraftStore();

  pending(accountId: number, mapId: number) {
    return this.#store.readCommit(accountId, mapId);
  }
  prepare(commit: PreparedSceneCommit) {
    return this.#store.writeCommit(commit);
  }
  acknowledge(commit: PreparedSceneCommit) {
    return this.#store.removeCommit(commit.accountId, commit.mapId);
  }

  async publish(
    commit: PreparedSceneCommit,
    progress: (value: number) => void,
  ): Promise<{
    scene: MapSceneHeaderV4 & { revision: number };
    serverCommitId: string;
  }> {
    const start = await firstValueFrom(
      this.#http.post<CommitStatus>(`/api/maps/${commit.mapId}/scene-commits`, {
        idempotencyKey: commit.idempotencyKey,
        expectedRevision: commit.expectedRevision,
        ...(commit.sourceMapId !== undefined
          ? {
              sourceMapId: commit.sourceMapId,
              sourceRevision: commit.sourceRevision,
            }
          : {}),
      }),
    );
    const base = `/api/maps/${commit.mapId}/scene-commits/${start.id}`;
    if (start.status === 'expired') {
      const retry = { ...commit, idempotencyKey: crypto.randomUUID() };
      await this.prepare(retry);
      return this.publish(retry, progress);
    }
    let revision = start.revision;
    let saved: (MapSceneHeaderV4 & { revision: number }) | undefined;
    if (start.status !== 'committed') {
      if (start.status !== 'uploading') throw new Error('Map save is closed');
      if (commit.sourceMapId !== undefined) {
        let complete = false;
        while (!complete) {
          const batch = await firstValueFrom(
            this.#http.put<{ complete: boolean }>(`${base}/source-tiles`, {}),
          );
          complete = batch.complete;
        }
      }
      const bundle = await sceneBundle(commit);
      progress(25);
      const receipt = await firstValueFrom(
        this.#http.put<{ count: number; hash: string }>(
          `${base}/bundle`,
          bundle.file,
          { headers: { 'Content-Type': SceneBundleCodec.contentType } },
        ),
      );
      if (receipt.count !== bundle.count || receipt.hash !== bundle.hash)
        throw new Error('Сервер не подтвердил полный пакет карты');
      progress(95);
      const result = await firstValueFrom(
        this.#http.patch<{
          revision: number;
          scene: MapSceneHeaderV4 & { revision: number };
        }>(base, {
          header: JSON.stringify(commit.header),
          containers: commit.containers,
        }),
      );
      revision = result.revision;
      saved = result.scene;
    }
    if (revision === undefined) throw new Error('Map save has no revision');
    saved ??= await firstValueFrom(
      this.#http.get<MapSceneHeaderV4 & { revision: number }>(
        `/api/maps/${commit.mapId}/scene`,
      ),
    );
    if (!isMapSceneHeaderV4(saved) || saved.revision !== revision)
      throw new Error('Saved map revision could not be read');
    return { scene: saved, serverCommitId: start.id };
  }
}
