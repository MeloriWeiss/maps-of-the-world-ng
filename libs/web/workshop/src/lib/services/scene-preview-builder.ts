import {
  mapPreviewBounds,
  mapPreviewMaxLevel,
  mapPreviewPixels,
} from '@wm/shared/workshop';
import { SceneDependencyImages } from '../rendering/scene-dependency-images';
import { createFrozenShapeRenderContext } from '../rendering/shape-render-context';
import { restoreSerializedShape } from '../shapes/restore-serialized-shape';
import type { SerializedChunkShape } from '../interfaces/workshop-scene-graph-storage';
import { SceneCommitStore } from './scene-commit.store';
import { SceneDependencyStore } from './scene-dependency.store';
import { ScenePreviewIndex } from './scene-preview-index';
import { SceneSaveSnapshot } from './scene-save-snapshot';
import {
  SceneLocalPart,
  SceneLocalWork,
  SceneWriterToken,
} from './workshop-scene-local.types';

/** Кодирует холст в PNG и сообщает об ошибке, если браузер не создал изображение. */
function pngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Не удалось создать PNG превью')),
      'image/png',
    );
  });
}

/** Вычисляет контрольную сумму бинарного файла превью. */
async function blobDigest(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Строит обзорные тайлы карты из данных зафиксированного коммита.
 *
 * Рендеринг выполняется небольшими порциями, чтобы не блокировать интерфейс
 * при подготовке больших сцен.
 */
export class ScenePreviewBuilder {
  readonly #commits: SceneCommitStore;
  readonly #dependencies: SceneDependencyStore;
  readonly #index: ScenePreviewIndex;

  constructor(
    commits: SceneCommitStore,
    dependencies: SceneDependencyStore,
    index: ScenePreviewIndex,
  ) {
    this.#commits = commits;
    this.#dependencies = dependencies;
    this.#index = index;
  }

  /**
   * Создаёт обзорные тайлы для изменённых областей сцены.
   *
   * @param token Токен эксклюзивной записи документа.
   * @param snapshot Неизменяемый снимок диапазона изменений.
   */
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
      !manifest.renderPalette?.['--workshop-map-bg-color'] ||
      (
        await this.#commits.readWork(
          snapshot.documentKey,
          snapshot.localCommitId,
          'checkpoint:links',
        )
      )?.status !== 'complete'
    ) {
      throw new Error('Превью карты нельзя подготовить без полного индекса');
    }

    if (
      await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:previews',
      )
    )
      return;

    await this.#prepareParents(token, snapshot);

    const canvas = document.createElement('canvas');
    canvas.width = mapPreviewPixels;
    canvas.height = mapPreviewPixels;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен для превью карты');

    const images = new SceneDependencyImages(
      this.#dependencies,
      snapshot.documentKey,
      snapshot.localCommitId,
    );

    const renderContext = createFrozenShapeRenderContext(
      manifest.renderPalette,
      images,
    );

    try {
      let processed = 0;
      for await (const leaf of this.#index.leaves(snapshot)) {
        if (leaf.status !== 'pending') continue;
        if (leaf.x === undefined || leaf.y === undefined)
          throw new Error('Неверный лист превью');

        this.#reset(ctx);
        const bounds = mapPreviewBounds(0, leaf.x, leaf.y);
        ctx.setTransform(
          mapPreviewPixels / bounds.width,
          0,
          0,
          mapPreviewPixels / bounds.height,
          (-bounds.x * mapPreviewPixels) / bounds.width,
          (-bounds.y * mapPreviewPixels) / bounds.height,
        );

        let renderedParts = 0;
        for await (const part of this.#index.partsForLeaf(
          snapshot,
          leaf.x,
          leaf.y,
        )) {
          if (!part.partId) throw new Error('Неверная ссылка превью');
          const body = await this.#index.readPayload(snapshot, part.partId);
          const record = JSON.parse(body) as SerializedChunkShape;
          if (record.shape?.id !== part.partId)
            throw new Error('Геометрия превью повреждена');

          const shape = restoreSerializedShape(record.shape, false);
          const release = await shape.prepareRender(renderContext);
          try {
            shape.render(ctx, renderContext);
          } finally {
            release();
          }
          if (++renderedParts % 64 === 0) await this.#yieldUi();
        }

        await this.#storeTile(token, snapshot, leaf, canvas);
        if (++processed % 8 === 0) await this.#yieldUi();
      }
    } finally {
      images.dispose();
    }

    let processed = 0;

    for (let level = 1; level <= mapPreviewMaxLevel; level++) {
      let after = '';

      while (true) {
        const tasks = await this.#commits.listWorkPrefix(
          snapshot.documentKey,
          snapshot.localCommitId,
          `preview:${level}:`,
          after,
          1,
        );
        if (!tasks.length) break;
        const task = tasks[0];
        if (task.status === 'pending') {
          if (task.x === undefined || task.y === undefined)
            throw new Error('Неверный родительский тайл');
          this.#reset(ctx);
          await this.#drawChildren(ctx, snapshot, level, task.x, task.y);
          await this.#storeTile(token, snapshot, task, canvas);
          if (++processed % 8 === 0) await this.#yieldUi();
        }

        after = task.taskKey;
      }
    }

    await this.#commits.putWork(
      token,
      this.#work(snapshot, 'checkpoint:previews', 'checkpoint', 'complete'),
    );
  }

  /** Создаёт задачи для родительских тайлов на всех уровнях превью. */
  async #prepareParents(token: SceneWriterToken, snapshot: SceneSaveSnapshot) {
    if (
      await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:parent-tasks',
      )
    )
      return;

    let batch: SceneLocalWork[] = [];
    for await (const leaf of this.#index.leaves(snapshot)) {
      if (leaf.x === undefined || leaf.y === undefined)
        throw new Error('Неверный лист превью');

      let x = leaf.x,
        y = leaf.y;
      for (let level = 1; level <= mapPreviewMaxLevel; level++) {
        x = Math.floor(x / 2);
        y = Math.floor(y / 2);
        batch.push({
          ...this.#work(
            snapshot,
            `preview:${level}:${x}:${y}`,
            'preview',
            'pending',
          ),
          level,
          x,
          y,
        });
        if (batch.length === 128) {
          await this.#commits.putWorks(token, batch);
          batch = [];
        }
      }
    }

    if (batch.length) await this.#commits.putWorks(token, batch);
    await this.#commits.putWork(
      token,
      this.#work(snapshot, 'checkpoint:parent-tasks', 'checkpoint', 'complete'),
    );
  }

  /** Собирает родительский тайл из четырёх дочерних тайлов. */
  async #drawChildren(
    ctx: CanvasRenderingContext2D,
    snapshot: SceneSaveSnapshot,
    level: number,
    x: number,
    y: number,
  ) {
    for (let childY = 0; childY < 2; childY++)
      for (let childX = 0; childX < 2; childX++) {
        const key = `${level - 1}:${x * 2 + childX}:${y * 2 + childY}`;
        const prepared = await this.#commits.readPart(
          snapshot.documentKey,
          snapshot.localCommitId,
          'tile',
          key,
        );

        let blob = prepared?.png;
        if (!prepared) {
          const dependency = await this.#dependencies.read(
            snapshot.documentKey,
            snapshot.localCommitId,
            'tile',
            key,
          );

          if (dependency?.blob) blob = dependency.blob;
          else if (
            !(await this.#dependencies.read(
              snapshot.documentKey,
              snapshot.localCommitId,
              'empty',
              key,
            ))
          ) {
            throw new Error('Нет дочернего тайла или отметки пустой области');
          }
        }
        if (!blob) continue;

        const image = await createImageBitmap(blob);
        try {
          ctx.drawImage(image, childX * 128, childY * 128, 128, 128);
        } finally {
          image.close();
        }
      }
  }

  /** Кодирует и сохраняет PNG-тайл вместе с контрольной суммой. */
  async #storeTile(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    task: SceneLocalWork,
    canvas: HTMLCanvasElement,
  ) {
    if (
      task.level === undefined ||
      task.x === undefined ||
      task.y === undefined
    ) {
      throw new Error('Неверный тайл превью');
    }

    const key = `${task.level}:${task.x}:${task.y}`;
    const existing = await this.#commits.readPart(
      snapshot.documentKey,
      snapshot.localCommitId,
      'tile',
      key,
    );

    const blob = existing?.png ?? (await pngBlob(canvas));
    const manifest = await this.#commits.readManifest(
      snapshot.documentKey,
      snapshot.localCommitId,
    );

    if (!manifest) throw new Error('Коммит карты исчез');

    if (!existing && manifest.totalBytes + blob.size > 128 * 1024 * 1024) {
      throw new Error('Подготовленный пакет карты превышает лимит');
    }

    const part: SceneLocalPart = {
      documentKey: snapshot.documentKey,
      localCommitId: snapshot.localCommitId,
      kind: 'tile',
      partKey: key,
      ordinal: existing?.ordinal ?? manifest.tileCount,
      byteLength: blob.size,
      digest: existing?.digest ?? (await blobDigest(blob)),
      png: blob,
      level: task.level,
      x: task.x,
      y: task.y,
    };
    await this.#commits.writePartAndCheckpoint(token, part, {
      ...task,
      status: 'complete',
    });
  }

  /** Очищает контекст и сбрасывает параметры перед рендерингом тайла. */
  #reset(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, mapPreviewPixels, mapPreviewPixels);
  }

  /** Передаёт управление браузеру между крупными порциями рендеринга. */
  #yieldUi(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Создаёт базовую запись задачи подготовки для текущего снимка. */
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
