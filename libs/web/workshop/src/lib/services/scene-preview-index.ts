import { mapChunkSize, mapWorldHalfSize } from '@wm/shared/workshop';
import { SceneCommitStore } from './scene-commit.store';
import { SceneDependencyStore } from './scene-dependency.store';
import { SceneSaveSnapshot } from './scene-save-snapshot';
import { SceneLocalWork, SceneWriterToken } from './workshop-scene-local.types';

interface Leaf {
  x: number;
  y: number;
}
interface Row {
  y: number;
  xs: number[];
}
interface Progress {
  partId: string;
  orderPath: readonly (readonly [number, number, string])[];
  rank: number;
  offset: number;
}
const encoder = new TextEncoder();

function firstAtLeast(values: readonly number[], target: number): number {
  let low = 0,
    high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function firstRowAtLeast(rows: readonly Row[], target: number): number {
  let low = 0,
    high = rows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle].y < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function parseProgress(body: string): Progress {
  const value: unknown = JSON.parse(body);
  if (
    !value ||
    typeof value !== 'object' ||
    !('partId' in value) ||
    !('orderPath' in value) ||
    !('rank' in value) ||
    !('offset' in value) ||
    typeof value.partId !== 'string' ||
    !Array.isArray(value.orderPath) ||
    !value.orderPath.every(
      (segment: unknown) =>
        Array.isArray(segment) &&
        segment.length === 3 &&
        typeof segment[0] === 'number' &&
        Number.isFinite(segment[0]) &&
        typeof segment[1] === 'number' &&
        Number.isSafeInteger(segment[1]) &&
        typeof segment[2] === 'string',
    ) ||
    typeof value.rank !== 'number' ||
    !Number.isSafeInteger(value.rank) ||
    typeof value.offset !== 'number' ||
    !Number.isSafeInteger(value.offset)
  ) {
    throw new Error('Повреждён checkpoint ссылок превью');
  }
  return {
    partId: value.partId,
    orderPath: value.orderPath,
    rank: value.rank,
    offset: value.offset,
  };
}

/** Temporary, bounded index for the dirty leaves of one sealed commit. */
export class ScenePreviewIndex {
  readonly #commits: SceneCommitStore;
  readonly #dependencies: SceneDependencyStore;

  constructor(commits: SceneCommitStore, dependencies: SceneDependencyStore) {
    this.#commits = commits;
    this.#dependencies = dependencies;
  }

  async prepare(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
  ): Promise<void> {
    const manifest = await this.#commits.readManifest(
      snapshot.documentKey,
      snapshot.localCommitId,
    );
    if (
      !manifest ||
      manifest.state !== 'preparing' ||
      !manifest.dependenciesComplete ||
      manifest.fromSeq !== snapshot.fromSeq ||
      manifest.cutSeq !== snapshot.cutSeq ||
      token.documentKey !== snapshot.documentKey ||
      !(await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:pages',
      ))
    ) {
      throw new Error('Итоговые части карты ещё не подготовлены');
    }
    const completed = await this.#commits.readWork(
      snapshot.documentKey,
      snapshot.localCommitId,
      'checkpoint:links',
    );
    if (completed?.status === 'complete') return;
    const rows = await this.#loadLeaves(snapshot);
    if (!completed) await this.#writeLeafTasks(token, snapshot, rows);

    let progress = completed?.body ? parseProgress(completed.body) : null;
    if (progress && progress.offset >= 0) {
      const descriptor = await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        `final:${progress.partId}`,
      );
      if (
        !descriptor ||
        JSON.stringify(descriptor.orderPath) !==
          JSON.stringify(progress.orderPath) ||
        !descriptor.visible
      )
        throw new Error('Индекс частей изменился после checkpoint');
      await this.#linkPart(
        token,
        snapshot,
        rows,
        descriptor,
        progress.rank,
        progress.offset,
      );
      progress = { ...progress, rank: progress.rank + 1, offset: -1 };
    }

    let afterKey: IDBValidKey | undefined = progress
      ? [
          snapshot.documentKey,
          snapshot.localCommitId,
          progress.orderPath,
          progress.partId,
        ]
      : undefined;
    let rank = progress?.rank ?? 0;
    while (true) {
      const page = await this.#commits.listFinalOrder(
        snapshot.documentKey,
        snapshot.localCommitId,
        afterKey,
        1,
      );
      if (!page.items.length) break;
      const descriptor = page.items[0];
      if (
        !descriptor.partId ||
        !descriptor.orderPath ||
        !descriptor.bounds ||
        descriptor.visible === undefined
      )
        throw new Error('Неполное описание итоговой части');
      if (descriptor.visible) {
        await this.#linkPart(token, snapshot, rows, descriptor, rank, 0);
        rank++;
      } else {
        await this.#save(token, snapshot, [], {
          partId: descriptor.partId,
          orderPath: descriptor.orderPath,
          rank,
          offset: -1,
        });
      }
      afterKey = page.nextKey;
    }
    const finalCheckpoint = await this.#commits.readWork(
      snapshot.documentKey,
      snapshot.localCommitId,
      'checkpoint:links',
    );
    await this.#commits.completeWork(token, {
      ...(finalCheckpoint ??
        this.#work(snapshot, 'checkpoint:links', 'checkpoint', 'complete')),
      status: 'complete',
    });
  }

  async *leaves(snapshot: SceneSaveSnapshot): AsyncGenerator<SceneLocalWork> {
    let after = '';
    while (true) {
      const page = await this.#commits.listWorkPrefix(
        snapshot.documentKey,
        snapshot.localCommitId,
        'preview:0:',
        after,
      );
      if (!page.length) return;
      for (const leaf of page) yield leaf;
      after = page[page.length - 1].taskKey;
    }
  }

  async *partsForLeaf(
    snapshot: SceneSaveSnapshot,
    x: number,
    y: number,
  ): AsyncGenerator<SceneLocalWork> {
    let rank = -1;
    while (true) {
      const page = await this.#commits.listPreviewLeaf(
        snapshot.documentKey,
        snapshot.localCommitId,
        0,
        x,
        y,
        rank,
      );
      if (!page.length) return;
      for (const link of page) {
        if (!link.partId) throw new Error('Ссылка превью без объекта');
        const part = await this.#commits.readWork(
          snapshot.documentKey,
          snapshot.localCommitId,
          `final:${link.partId}`,
        );
        if (!part) throw new Error('Нет объекта для превью');
        yield part;
        rank = link.rank ?? rank;
      }
    }
  }

  async readPayload(
    snapshot: SceneSaveSnapshot,
    partId: string,
  ): Promise<string> {
    const work = await this.#commits.readWork(
      snapshot.documentKey,
      snapshot.localCommitId,
      `payload:${partId}`,
    );
    if (!work?.body) throw new Error('Нет геометрии объекта для превью');
    return work.body;
  }

  async #loadLeaves(snapshot: SceneSaveSnapshot): Promise<Row[]> {
    const byY = new Map<number, Set<number>>();
    let after: readonly [string, number] | null = null;
    let frames = 0,
      count = 0;
    while (true) {
      const records = await this.#dependencies.list(
        snapshot.documentKey,
        snapshot.localCommitId,
        'preview-plan',
        after,
        1,
      );
      if (!records.length) break;
      const record = records[0];
      if (record.segment !== 0 || !record.body)
        throw new Error('Неполный план превью');
      const values: unknown = JSON.parse(record.body);
      if (!Array.isArray(values)) throw new Error('Неверный план превью');
      const leaves: unknown[] = values;
      frames++;
      if (frames > 4096) throw new Error('Слишком много порций плана превью');
      for (const item of leaves) {
        if (
          !item ||
          typeof item !== 'object' ||
          !('x' in item) ||
          !('y' in item) ||
          typeof item.x !== 'number' ||
          typeof item.y !== 'number' ||
          !Number.isSafeInteger(item.x) ||
          !Number.isSafeInteger(item.y) ||
          item.x < -mapWorldHalfSize / mapChunkSize ||
          item.x >= mapWorldHalfSize / mapChunkSize ||
          item.y < -mapWorldHalfSize / mapChunkSize ||
          item.y >= mapWorldHalfSize / mapChunkSize
        )
          throw new Error('Неверный лист плана превью');
        const xs = byY.get(item.y) ?? new Set<number>();
        if (!xs.has(item.x)) {
          xs.add(item.x);
          byY.set(item.y, xs);
          count++;
          if (count > 4096) throw new Error('Слишком много затронутых тайлов');
        }
      }
      after = [record.resourceKey, record.segment];
    }
    if (!frames) throw new Error('Отсутствует план затронутых тайлов');
    return [...byY]
      .map(([y, xs]) => ({ y, xs: [...xs].sort((a, b) => a - b) }))
      .sort((a, b) => a.y - b.y);
  }

  async #writeLeafTasks(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    rows: readonly Row[],
  ) {
    let batch: SceneLocalWork[] = [];
    for (const row of rows)
      for (const x of row.xs) {
        batch.push({
          ...this.#work(
            snapshot,
            `preview:0:${x}:${row.y}`,
            'preview',
            'pending',
          ),
          level: 0,
          x,
          y: row.y,
        });
        if (batch.length === 128) {
          await this.#commits.putWorks(token, batch);
          batch = [];
        }
      }
    if (batch.length) await this.#commits.putWorks(token, batch);
  }

  #intersections(
    rows: readonly Row[],
    bounds: readonly [number, number, number, number],
  ): Leaf[] {
    const minX = Math.floor(bounds[0] / mapChunkSize);
    const minY = Math.floor(bounds[1] / mapChunkSize);
    const maxX = Math.ceil(bounds[2] / mapChunkSize) - 1;
    const maxY = Math.ceil(bounds[3] / mapChunkSize) - 1;
    const result: Leaf[] = [];
    for (
      let rowIndex = firstRowAtLeast(rows, minY);
      rowIndex < rows.length && rows[rowIndex].y <= maxY;
      rowIndex++
    ) {
      const row = rows[rowIndex];
      for (
        let index = firstAtLeast(row.xs, minX);
        index < row.xs.length && row.xs[index] <= maxX;
        index++
      ) {
        result.push({ x: row.xs[index], y: row.y });
      }
    }
    return result;
  }

  async #linkPart(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    rows: readonly Row[],
    part: SceneLocalWork,
    rank: number,
    start: number,
  ) {
    if (!part.bounds || !part.partId || !part.orderPath)
      throw new Error('Нет данных итоговой части');
    const leaves = this.#intersections(rows, part.bounds);
    if (start > leaves.length) throw new Error('Неверный checkpoint ссылок');
    for (let offset = start; offset < leaves.length; ) {
      const links: SceneLocalWork[] = [];
      let bytes = 0;
      while (offset < leaves.length && links.length < 128) {
        const leaf = leaves[offset];
        const link: SceneLocalWork = {
          ...this.#work(
            snapshot,
            `link:${leaf.x}:${leaf.y}:${part.partId}`,
            'preview-link',
            'complete',
          ),
          level: 0,
          x: leaf.x,
          y: leaf.y,
          partId: part.partId,
          rank,
        };
        const size = encoder.encode(JSON.stringify(link)).byteLength;
        if (links.length && bytes + size > 64 * 1024) break;
        if (size > 64 * 1024) throw new Error('Ссылка превью слишком велика');
        links.push(link);
        bytes += size;
        offset++;
      }
      await this.#save(token, snapshot, links, {
        partId: part.partId,
        orderPath: part.orderPath,
        rank,
        offset,
      });
    }
    await this.#save(token, snapshot, [], {
      partId: part.partId,
      orderPath: part.orderPath,
      rank: rank + 1,
      offset: -1,
    });
  }

  async #save(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    links: readonly SceneLocalWork[],
    progress: Progress,
  ) {
    const checkpoint = {
      ...this.#work(snapshot, 'checkpoint:links', 'checkpoint', 'pending'),
      body: JSON.stringify(progress),
    };
    await this.#commits.writeLinksAndCheckpoint(
      token,
      snapshot.localCommitId,
      links,
      checkpoint,
    );
  }

  #work(
    snapshot: SceneSaveSnapshot,
    taskKey: string,
    kind: SceneLocalWork['kind'],
    status: SceneLocalWork['status'],
  ): SceneLocalWork {
    return {
      documentKey: snapshot.documentKey,
      localCommitId: snapshot.localCommitId,
      taskKey,
      kind,
      status,
    };
  }
}
