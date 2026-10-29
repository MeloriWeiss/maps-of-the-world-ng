import type { SerializedChunkShape } from '../interfaces/workshop-scene-graph-storage';
import { SceneDependencyStore } from './scene-dependency.store';
import { SceneDraftRepository } from './scene-draft.repository';
import { SceneLocalMutation } from './workshop-scene-local.types';

/** Первое и последнее состояние объекта в зафиксированном изменении. */
export interface FrozenSceneChange {
  first: SceneLocalMutation;
  latest: SceneLocalMutation;
}

/**
 * Предоставляет неизменяемое представление документа для сохранения сцены.
 *
 * Данные читаются из зафиксированного локального документа, а не из графа,
 * который продолжает изменяться во время редактирования.
 */
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

  /** Возвращает поток изменений документа в пределах снимка. */
  changes(): AsyncGenerator<FrozenSceneChange> {
    return this.#drafts.iterateChangedEntities(
      this.documentKey,
      this.fromSeq,
      this.cutSeq,
    );
  }

  /**
   * Читает состояние фигуры на момент снимка с учётом локальных изменений.
   *
   * @param partId Идентификатор фигуры.
   * @param baseCell Ячейка базовой сцены, в которой ищется фигура.
   * @returns Сериализованная фигура или `null`, если она удалена либо отсутствует.
   */
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

  /** Читает состояние контейнера на момент зафиксированного снимка. */
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
