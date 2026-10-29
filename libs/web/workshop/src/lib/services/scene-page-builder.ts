import { mapCellOf, mapChunkSize } from '@wm/shared/workshop';
import type { SerializedChunkShape } from '../interfaces/workshop-scene-graph-storage';
import { SceneCommitStore } from './scene-commit.store';
import { SceneDependencyStore } from './scene-dependency.store';
import { SceneSaveSnapshot } from './scene-save-snapshot';
import {
  SceneLocalPart,
  SceneLocalWork,
  SceneWriterToken,
} from './workshop-scene-local.types';

const encoder = new TextEncoder();
const PAGE_LIMIT = 240_000;
const RECORD_LIMIT = 500;

/** Проверяет границы сериализованной фигуры и возвращает её крайние координаты. */
function boundsOf(record: SerializedChunkShape) {
  const bounds = record.bounds;
  if (
    !bounds ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  )
    throw new Error('У объекта нет корректных границ');
  return {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height,
  };
}

/** Преобразует строковый ключ ячейки в целочисленные координаты. */
function cellCoordinates(cell: string) {
  const match = /^(-?\d+):(-?\d+)$/.exec(cell);
  if (!match) throw new Error('Неверная ячейка карты');
  const cellX = Number(match[1]),
    cellY = Number(match[2]);
  if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellY))
    throw new Error('Неверная ячейка карты');
  return { cellX, cellY };
}

/** Проверяет идентификатор фигуры, родителя и соответствие ячейке карты. */
function validateOwner(
  record: SerializedChunkShape,
  partId: string,
  cell: string,
) {
  if (record?.shape?.id !== partId || !record.node || !record.parentId) {
    throw new Error('Неверный объект страницы карты');
  }
  const bounds = boundsOf(record);
  if (`${mapCellOf(bounds.minX)}:${mapCellOf(bounds.minY)}` !== cell) {
    throw new Error('Объект находится в другой ячейке');
  }
  return bounds;
}

/** Вычисляет SHA-256 для сериализованной страницы карты. */
async function digest(body: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Пересобирает изменённые ячейки сцены для сохранения.
 *
 * Источниками данных служат зафиксированный журнал и проверенные исходные
 * страницы; неизменённые ячейки повторно не сериализуются.
 */
export class ScenePageBuilder {
  readonly #commits: SceneCommitStore;
  readonly #dependencies: SceneDependencyStore;
  readonly #containerCache = new Map<
    string,
    {
      id: string;
      parentId: string | null;
      orderKey: number;
      index: number;
      visible: boolean;
    }
  >();

  constructor(commits: SceneCommitStore, dependencies: SceneDependencyStore) {
    this.#commits = commits;
    this.#dependencies = dependencies;
  }

  /**
   * Готовит страницы и контейнеры для зафиксированного коммита.
   *
   * @param token Токен эксклюзивной записи документа.
   * @param snapshot Неизменяемый снимок диапазона изменений.
   */
  async prepare(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
  ): Promise<void> {
    this.#containerCache.clear();
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
      token.documentKey !== snapshot.documentKey
    )
      throw new Error('Срез карты не совпадает с коммитом');

    if (
      await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:pages',
      )
    )
      return;

    await this.#indexChanges(token, snapshot, manifest.header.rootId);
    await this.#stageBasePages(token, snapshot, manifest.header.rootId);

    let after = '';
    while (true) {
      const tasks = await this.#commits.listWorkPrefix(
        snapshot.documentKey,
        snapshot.localCommitId,
        'dirty:',
        after,
        1,
      );
      if (!tasks.length) break;
      const task = tasks[0];
      if (task.status === 'pending')
        await this.#buildCell(token, snapshot, task);

      after = task.taskKey;
    }
    await this.#commits.putWork(
      token,
      this.#work(snapshot, 'checkpoint:pages', 'checkpoint', 'complete'),
    );
  }

  /** Индексирует изменённые части и отмечает затронутые ячейки. */
  async #indexChanges(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    rootId: string,
  ) {
    if (
      await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:changes',
      )
    )
      return;
    for await (const { first, latest } of snapshot.changes()) {
      if (latest.entityType !== 'part') continue;

      const partId = latest.entityId;
      await this.#commits.putWork(
        token,
        this.#work(snapshot, `change:${partId}`, 'scratch', 'complete'),
      );
      const oldCell = first.oldCell ?? first.newCell;
      const newCell = latest.deleted ? undefined : latest.newCell;
      if (!latest.deleted && (!newCell || !latest.body))
        throw new Error('Нет postimage изменённого объекта');

      for (const cell of new Set(
        [oldCell, newCell].filter(
          (value): value is string => value !== undefined,
        ),
      )) {
        const { cellX, cellY } = cellCoordinates(cell);
        const taskKey = `dirty:${cell}`;
        if (
          !(await this.#commits.readWork(
            snapshot.documentKey,
            snapshot.localCommitId,
            taskKey,
          ))
        ) {
          await this.#commits.putWork(token, {
            ...this.#work(snapshot, taskKey, 'dirty-cell', 'pending'),
            cellX,
            cellY,
          });
        }
      }

      if (newCell && latest.body) {
        const record = JSON.parse(latest.body) as SerializedChunkShape;
        validateOwner(record, partId, newCell);
        if (encoder.encode(latest.body).byteLength > PAGE_LIMIT - 2) {
          throw new Error('Объект слишком велик для страницы карты');
        }

        await this.#putFinal(
          token,
          snapshot,
          rootId,
          newCell,
          record,
          latest.body,
        );
      }
    }
    await this.#commits.putWork(
      token,
      this.#work(snapshot, 'checkpoint:changes', 'checkpoint', 'complete'),
    );
  }

  /** Переносит неизменённые записи базовых страниц в итоговый коммит. */
  async #stageBasePages(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    rootId: string,
  ) {
    if (
      await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        'checkpoint:base-staged',
      )
    )
      return;

    let after: readonly [string, number] | null = null;

    while (true) {
      const pages = await this.#dependencies.list(
        snapshot.documentKey,
        snapshot.localCommitId,
        'page',
        after,
        1,
      );
      if (!pages.length) break;

      const page = pages[0];
      if (page.segment !== 0 || !page.body)
        throw new Error('Неполная базовая страница');

      const match = /^(-?\d+):(-?\d+):(\d+)$/.exec(page.resourceKey);
      if (!match) throw new Error('Неверный ключ базовой страницы');

      const cell = `${Number(match[1])}:${Number(match[2])}`;
      const { cellX, cellY } = cellCoordinates(cell);
      const pageId = Number(match[3]);
      if (!Number.isSafeInteger(pageId) || pageId < 0)
        throw new Error('Неверный pageId зависимости');

      const dirty = await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        `dirty:${cell}`,
      );

      const records = JSON.parse(page.body) as SerializedChunkShape[];
      if (!Array.isArray(records)) throw new Error('Неверная базовая страница');

      let oldBounds: ReturnType<typeof boundsOf> | null = null;

      for (const record of records) {
        const partId = record?.shape?.id;
        if (typeof partId !== 'string' || !partId) {
          throw new Error('Неверный объект базовой страницы');
        }
        const bounds = validateOwner(record, partId, cell);

        if (dirty)
          oldBounds = oldBounds
            ? {
                minX: Math.min(oldBounds.minX, bounds.minX),
                minY: Math.min(oldBounds.minY, bounds.minY),
                maxX: Math.max(oldBounds.maxX, bounds.maxX),
                maxY: Math.max(oldBounds.maxY, bounds.maxY),
              }
            : bounds;

        if (
          await this.#commits.readWork(
            snapshot.documentKey,
            snapshot.localCommitId,
            `change:${partId}`,
          )
        )
          continue;

        const body = JSON.stringify(record);
        if (encoder.encode(body).byteLength > PAGE_LIMIT - 2) {
          throw new Error('Объект слишком велик для страницы карты');
        }
        const existing = await this.#commits.readWork(
          snapshot.documentKey,
          snapshot.localCommitId,
          `payload:${partId}`,
        );

        if (existing) {
          if (existing.body !== body)
            throw new Error('Разные базовые записи одной части карты');
          continue;
        }

        await this.#putFinal(token, snapshot, rootId, cell, record, body);
      }

      if (dirty)
        await this.#commits.putWork(token, {
          ...this.#work(
            snapshot,
            `old:${cell}:${pageId}`,
            'scratch',
            'complete',
          ),
          bounds: oldBounds
            ? [oldBounds.minX, oldBounds.minY, oldBounds.maxX, oldBounds.maxY]
            : [
                cellX * mapChunkSize,
                cellY * mapChunkSize,
                (cellX + 1) * mapChunkSize,
                (cellY + 1) * mapChunkSize,
              ],
        });

      after = [page.resourceKey, page.segment];
    }
    await this.#commits.putWork(
      token,
      this.#work(snapshot, 'checkpoint:base-staged', 'checkpoint', 'complete'),
    );
  }

  /** Пересобирает итоговые страницы одной изменённой ячейки. */
  async #buildCell(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    task: SceneLocalWork,
  ) {
    if (task.cellX === undefined || task.cellY === undefined)
      throw new Error('Нет координат ячейки');

    const { cellX, cellY } = task;
    const cell = `${cellX}:${cellY}`;

    let pageId = 0,
      body = '[',
      bytes = 2,
      count = 0;
    let extent: ReturnType<typeof boundsOf> | null = null;

    const flush = async () => {
      if (!count || !extent) return;
      await this.#writePage(
        token,
        snapshot,
        cellX,
        cellY,
        pageId++,
        `${body}]`,
        extent,
        false,
      );
      body = '[';
      bytes = 2;
      count = 0;
      extent = null;
    };

    let afterPart = '';

    while (true) {
      const parts = await this.#commits.listFinalCell(
        snapshot.documentKey,
        snapshot.localCommitId,
        cellX,
        cellY,
        afterPart,
        1,
      );
      if (!parts.length) break;

      const part = parts[0];
      if (!part.partId) throw new Error('Нет ID итогового объекта');
      const payload = await this.#commits.readWork(
        snapshot.documentKey,
        snapshot.localCommitId,
        `payload:${part.partId}`,
      );
      if (!payload?.body) throw new Error('Нет итогового объекта');
      const record = JSON.parse(payload.body) as SerializedChunkShape;
      const bounds = validateOwner(record, part.partId, cell);

      const partBytes = encoder.encode(payload.body).byteLength;
      if (partBytes + 2 > PAGE_LIMIT)
        throw new Error('Объект слишком велик для страницы карты');

      if (
        count &&
        (count >= RECORD_LIMIT || bytes + partBytes + 1 > PAGE_LIMIT)
      )
        await flush();

      body += `${count ? ',' : ''}${payload.body}`;
      bytes += partBytes + (count ? 1 : 0);

      extent = extent
        ? {
            minX: Math.min(extent.minX, bounds.minX),
            minY: Math.min(extent.minY, bounds.minY),
            maxX: Math.max(extent.maxX, bounds.maxX),
            maxY: Math.max(extent.maxY, bounds.maxY),
          }
        : bounds;
      count++;
      afterPart = part.partId;
    }

    await flush();

    let afterOld = '';

    while (true) {
      const old = await this.#commits.listWorkPrefix(
        snapshot.documentKey,
        snapshot.localCommitId,
        `old:${cell}:`,
        afterOld,
        1,
      );
      if (!old.length) break;

      const previousId = Number(old[0].taskKey.slice(`old:${cell}:`.length));
      if (previousId >= pageId) {
        const oldBounds = old[0].bounds;
        if (!oldBounds) throw new Error('Нет границ старой страницы');
        await this.#writePage(
          token,
          snapshot,
          cellX,
          cellY,
          previousId,
          '[]',
          {
            minX: oldBounds[0],
            minY: oldBounds[1],
            maxX: oldBounds[2],
            maxY: oldBounds[3],
          },
          true,
        );
      }
      afterOld = old[0].taskKey;
    }

    await this.#commits.completeWork(token, { ...task, status: 'complete' });
  }

  /** Сохраняет страницу ячейки и её описание в манифесте коммита. */
  async #writePage(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    cellX: number,
    cellY: number,
    pageId: number,
    body: string,
    extent: ReturnType<typeof boundsOf> | undefined,
    deleted: boolean,
  ) {
    const partKey = `${cellX}:${cellY}:${pageId}`;

    const existing = await this.#commits.readPart(
      snapshot.documentKey,
      snapshot.localCommitId,
      'page',
      partKey,
    );

    const manifest = await this.#commits.readManifest(
      snapshot.documentKey,
      snapshot.localCommitId,
    );

    if (!manifest) throw new Error('Коммит карты исчез');
    if (!existing && manifest.pageCount >= 256)
      throw new Error('Слишком много изменённых страниц за одно сохранение');

    if (
      !existing &&
      manifest.totalBytes + encoder.encode(body).byteLength > 128 * 1024 * 1024
    ) {
      throw new Error('Подготовленный пакет карты превышает лимит');
    }

    const part: SceneLocalPart = {
      documentKey: snapshot.documentKey,
      localCommitId: snapshot.localCommitId,
      kind: 'page',
      partKey,
      ordinal: existing?.ordinal ?? manifest.pageCount,
      byteLength: encoder.encode(body).byteLength,
      digest: await digest(body),
      cellX,
      cellY,
      pageId,
      body,
      deleted,
      ...(extent ?? {}),
    };
    await this.#commits.writePartAndCheckpoint(token, part);
  }

  /** Сохраняет итоговую фигуру и задачу её включения в страницу. */
  async #putFinal(
    token: SceneWriterToken,
    snapshot: SceneSaveSnapshot,
    rootId: string,
    cell: string,
    record: SerializedChunkShape,
    body: string,
  ) {
    const partId = record.shape.id;
    await this.#commits.putWorks(token, [
      {
        ...this.#work(snapshot, `payload:${partId}`, 'scratch', 'complete'),
        partId,
        body,
      },
      await this.#finalWork(snapshot, rootId, cell, record),
    ]);
  }

  /** Создаёт запись итоговой фигуры с порядком, границами и видимостью. */
  async #finalWork(
    snapshot: SceneSaveSnapshot,
    rootId: string,
    cell: string,
    record: SerializedChunkShape,
  ): Promise<SceneLocalWork> {
    const partId = record.shape.id;

    const { cellX, cellY } = cellCoordinates(cell);
    const bounds = validateOwner(record, partId, cell);
    if (
      !Number.isFinite(record.node.zIndex) ||
      !Number.isSafeInteger(record.index) ||
      !record.node.id
    ) {
      throw new Error('Неверный порядок объекта');
    }

    const path: [number, number, string][] = [
      [record.node.zIndex, record.index, record.node.id],
    ];
    let parentId = record.parentId;
    let visible = record.node.visible;
    const visited = new Set<string>();

    while (parentId !== rootId) {
      if (visited.has(parentId) || visited.size >= 64)
        throw new Error('Цикл в дереве слоёв карты');
      visited.add(parentId);
      const container = await this.#container(snapshot, parentId);
      if (container.parentId === null)
        throw new Error('Неверный родительский слой объекта');
      visible &&= container.visible;
      path.unshift([container.orderKey, container.index, container.id]);
      parentId = container.parentId;
    }

    const rootRecord = await this.#container(snapshot, rootId);
    visible &&= rootRecord.visible;
    return {
      ...this.#work(snapshot, `final:${partId}`, 'final-part', 'complete'),
      partId,
      cellX,
      cellY,
      parentId: record.parentId,
      visible,
      orderPath: path,
      bounds: [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
    };
  }

  /** Загружает и кэширует метаданные контейнера сцены. */
  async #container(snapshot: SceneSaveSnapshot, id: string) {
    const key = `${snapshot.localCommitId}:${id}`;
    const cached = this.#containerCache.get(key);
    if (cached) return cached;

    const source = await snapshot.readContainer(id);
    if (!source) throw new Error('Нет родительского слоя объекта');

    const record: unknown = JSON.parse(source);
    if (
      !record ||
      typeof record !== 'object' ||
      !('id' in record) ||
      record.id !== id ||
      !('parentId' in record) ||
      (record.parentId !== null && typeof record.parentId !== 'string') ||
      !('orderKey' in record) ||
      typeof record.orderKey !== 'number' ||
      !Number.isFinite(record.orderKey) ||
      !('index' in record) ||
      typeof record.index !== 'number' ||
      !Number.isSafeInteger(record.index) ||
      !('visible' in record) ||
      typeof record.visible !== 'boolean'
    ) {
      throw new Error('Неверный родительский слой объекта');
    }

    const container = {
      id,
      parentId: record.parentId,
      orderKey: record.orderKey,
      index: record.index,
      visible: record.visible,
    };

    if (this.#containerCache.size >= 256)
      this.#containerCache.delete(
        this.#containerCache.keys().next().value ?? '',
      );
    this.#containerCache.set(key, container);
    return container;
  }

  /** Создаёт базовую запись задачи для текущего коммита. */
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
