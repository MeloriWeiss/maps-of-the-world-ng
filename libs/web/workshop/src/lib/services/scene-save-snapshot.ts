import type { SerializedChunkShape } from './workshop-scene-graph-storage.service';
import { SceneDependencyStore } from './scene-dependency.store';
import { SceneDraftRepository } from './scene-draft.repository';
import { SceneLocalMutation } from './workshop-scene-local.types';

export interface FrozenSceneChange {
  first: SceneLocalMutation;
  latest: SceneLocalMutation;
}

/** A fixed cut of a document. It never reads the mutable editor graph or viewport loaders. */
export class SceneSaveSnapshot {
  readonly #drafts: SceneDraftRepository;
  readonly #dependencies: SceneDependencyStore;

  constructor(
    readonly documentKey: string,
    readonly localCommitId: string,
    readonly fromSeq: number,
    readonly cutSeq: number,
    drafts: SceneDraftRepository,
    dependencies: SceneDependencyStore,
  ) {
    if (
      !Number.isSafeInteger(fromSeq) ||
      !Number.isSafeInteger(cutSeq) ||
      fromSeq < 0 ||
      cutSeq < fromSeq
    )
      throw new RangeError('Invalid scene snapshot range');
    this.#drafts = drafts;
    this.#dependencies = dependencies;
  }

  changes(): AsyncGenerator<FrozenSceneChange> {
    return this.#drafts.iterateChangedEntities(
      this.documentKey,
      this.fromSeq,
      this.cutSeq,
    );
  }

  async readPart(
    partId: string,
    baseCell: string,
  ): Promise<SerializedChunkShape | null> {
    const local = await this.#drafts.readEntityAt(
      this.documentKey,
      'part',
      partId,
      this.cutSeq,
    );
    if (local && local.seq > this.fromSeq) {
      if (local.deleted) return null;
      if (!local.body) throw new Error('Part postimage is missing');
      return JSON.parse(local.body) as SerializedChunkShape;
    }
    let afterKey = '';
    while (true) {
      const page = await this.#dependencies.listCellPages(
        this.documentKey,
        this.localCommitId,
        baseCell,
        afterKey,
      );
      for (const dependency of page) {
        if (!dependency.body)
          throw new Error('Base page dependency is missing');
        const records = JSON.parse(dependency.body) as SerializedChunkShape[];
        const found = records.find((record) => record.shape.id === partId);
        if (found) return found;
      }
      if (page.length < 16) return null;
      afterKey = page[page.length - 1].resourceKey;
    }
  }

  async readContainer(containerId: string): Promise<string | null> {
    const local = await this.#drafts.readEntityAt(
      this.documentKey,
      'container',
      containerId,
      this.cutSeq,
    );
    if (local && local.seq > this.fromSeq)
      return local.deleted ? null : (local.body ?? null);
    const base = await this.#dependencies.read(
      this.documentKey,
      this.localCommitId,
      'container',
      containerId,
    );
    return base?.body ?? null;
  }
}
