import type {
  PageResponse,
  ContainerRecord,
  TileImage,
  SceneObjectPage,
  PageUpload,
} from '../interfaces/workshop-chunks';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  createEmptyMapSceneHeader,
  intersectsBounds,
  isMapChunkBody,
  isMapSceneHeaderV4,
  MapPreviewDescriptor,
  MapSceneHeaderV4,
  MapScenePageDescriptor,
  mapCellOf,
  mapChunkSize,
  mapPreviewBounds,
  mapPreviewMaxLevel,
  mapWorldHalfSize,
  WorldBounds,
} from '@wm/shared/workshop';
import { NodesTypes } from '../consts';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import type {
  SerializedChunkShape,
  SerializedNode,
} from '../interfaces/workshop-scene-graph-storage';
import { GraphNode, ShapeNode } from '../nodes';
import { WorkshopCoordsService } from './workshop-coords.service';
import { CurrentAccountStore } from '@wm/web/data-access/profile';
import { WorkshopModeService } from './workshop-mode.service';
import { WorkshopSceneDraftStore } from './workshop-scene-draft.store';
import {
  PreparedSceneCommit,
  SceneContainerChange,
} from './scene-commit.types';
import { WorkshopSceneCommitCoordinator } from './workshop-scene-commit-coordinator';
import { SceneOperationJournal } from './scene-operation-journal';
import { createSceneMutation } from './scene-history';
import { canvasColor } from '../rendering/palette';
import {
  pageKey,
  cellKey,
  tileKey,
  contains,
  unionBounds,
} from './utils/workshop-chunk-geometry';

const utf8 = new TextEncoder();

/** Загружает и кэширует страницы объектов и тайлы превью карты. */
@Injectable()
export class WorkshopChunksService {
  #http = inject(HttpClient);
  #storage = inject(WorkshopSceneGraphStorageService);
  #coords = inject(WorkshopCoordsService);
  #account = inject(CurrentAccountStore);
  #mode = inject(WorkshopModeService);
  #draftStore = new WorkshopSceneDraftStore();
  #commits = inject(WorkshopSceneCommitCoordinator);

  #draftTimer: ReturnType<typeof setTimeout> | null = null;
  #epoch = 0;
  #mapId: number | null = null;
  #header: MapSceneHeaderV4 | null = null;
  #pages = new Map<string, MapScenePageDescriptor>();
  #loaded = new Set<string>();
  #pageIds = new Map<string, Set<string>>();
  #clean = new Map<string, string>();
  #baselineRecords = new Map<string, SerializedChunkShape>();
  #dirtyPages = new Set<string>();

  #covered: WorldBounds[] = [];
  #discovering = new Map<string, Promise<void>>();

  #tiles = new Map<string, TileImage>();
  #maxTiles = 480;
  #tilePending = new Map<string, Promise<TileImage | null>>();
  #tileMissing = new Set<string>();
  #tileFailed = new Set<string>();
  #tileBlocks = new Set<string>();
  #tileBlockPending = new Map<string, Promise<void>>();
  #tileBlockFailed = new Set<string>();
  #availableTiles = new Map<string, number>();
  #tilePackPending = new Map<string, Promise<void>>();
  #tilePackFailed = new Set<string>();

  #tileRequestTimer: ReturnType<typeof setTimeout> | null = null;
  #tileRequestSignature = '';
  #knownContainers = new Set<string>();
  #baselineContainers = new Map<string, SceneContainerChange>();

  #forceDetails = false;
  #saving = false;
  #recoveryBaseRevision: number | null = null;
  #preparedCommit: PreparedSceneCommit | null = null;
  #draftTargetMapId: number | null = null;
  #draftRecoveryError = false;
  #journal: SceneOperationJournal | null = null;
  #journalCaptureError: Error | null = null;
  #saveFetchedCells = new Set<string>();
  revision = 0;
  changed: () => void = () => undefined;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly canEditViewport = signal(true);
  readonly saveProgress = signal(0);
  readonly sceneMapId = signal<number | null>(null);
  readonly sceneRevision = signal(0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  /** Сбрасывает состояние загруженной сцены и освобождает временные ресурсы. */
  reset() {
    this.#journal = null;
    this.#journalCaptureError = null;
    this.#storage.persistCompletedOperation = null;
    this.#epoch += 1;

    if (this.#draftTimer) clearTimeout(this.#draftTimer);
    this.#draftTimer = null;
    if (this.#tileRequestTimer) clearTimeout(this.#tileRequestTimer);
    this.#tileRequestTimer = null;
    this.#tileRequestSignature = '';

    for (const tile of this.#tiles.values())
      if (tile.url) URL.revokeObjectURL(tile.url);

    this.#tiles.clear();
    this.#tilePending.clear();
    this.#tileMissing.clear();
    this.#tileFailed.clear();
    this.#tileBlocks.clear();
    this.#tileBlockPending.clear();
    this.#tileBlockFailed.clear();
    this.#tilePackPending.clear();
    this.#tilePackFailed.clear();
    this.#availableTiles.clear();
    this.#saveFetchedCells.clear();

    this.#pages.clear();
    this.#loaded.clear();
    this.#pageIds.clear();
    this.#clean.clear();
    this.#baselineRecords.clear();
    this.#dirtyPages.clear();
    this.#covered = [];
    this.#discovering.clear();

    this.#knownContainers.clear();
    this.#header = null;
    this.#mapId = null;
    this.#baselineContainers.clear();

    this.sceneMapId.set(null);
    this.sceneRevision.set(0);
    this.#forceDetails = false;
    this.#saving = false;
    this.revision = 0;
    this.#recoveryBaseRevision = null;
    this.#preparedCommit = null;
    this.#draftTargetMapId = null;
    this.#draftRecoveryError = false;
    this.#storage.sceneBounds = null;
    this.#storage.persistRemoteDraft = null;

    this.loading.set(false);
    this.error.set('');
    this.saveProgress.set(0);
    this.canEditViewport.set(true);
  }

  /**
   * Открывает сцену карты и восстанавливает её локальные данные.
   *
   * @param id Идентификатор карты.
   * @param raw Сериализованный заголовок сцены.
   * @param revision Версия сцены, которую необходимо открыть.
   */
  async open(id: number, raw: string, revision = 0) {
    this.reset();
    const value: unknown = JSON.parse(raw);
    if (!isMapSceneHeaderV4(value)) throw new Error('Unsupported map format');

    this.#mapId = id;
    this.revision = revision;
    this.#header = value;
    this.sceneMapId.set(id);
    this.sceneRevision.set(revision);
    this.#storage.importSceneRoot(value.rootId);
    this.#knownContainers.add(value.rootId);
    this.#storage.sceneBounds = value.bounds;
    const epoch = this.#epoch;
    const scene = await firstValueFrom(
      this.#http.get<MapSceneHeaderV4 & { revision: number }>(
        `/api/maps/${id}/scene`,
      ),
    );
    if (epoch !== this.#epoch) return;
    if (!isMapSceneHeaderV4(scene) || scene.revision !== revision)
      throw new Error('Map changed while opening');
    this.#header = scene;
    this.#storage.sceneBounds = scene.bounds;
    await this.#ensureParents([scene.rootId], true);
    await this.#loadBootstrapTiles(scene.bootstrap);
    if (epoch !== this.#epoch) return;
    await this.#restorePendingCommit(id, revision);
    await this.#restoreDraft(id, revision);
    if (!this.#mode.isReadOnly() && !this.#draftRecoveryError)
      this.#activateJournal(id, revision);
    this.#storage.persistRemoteDraft = () => this.#saveDraft();
    this.#forceDetails = revision === 0;
    this.changed();
  }

  /** Проверяет, загружена ли сцена указанной карты. */
  hasSceneFor(id: number) {
    return this.#mapId === id && this.#header !== null;
  }

  /** Рисует доступные обзорные тайлы в текущей области холста. */
  drawOverview(ctx: CanvasRenderingContext2D) {
    const viewport = this.#coords.worldViewport;
    const targetLevel = this.#viewportPreviewLevel(viewport);
    let drawn = false;

    for (const [key, tile] of [...this.#tiles].sort(
      ([a], [b]) => Number(b.split(':')[0]) - Number(a.split(':')[0]),
    )) {
      const [level, x, y] = key.split(':').map(Number);
      if (level < targetLevel) continue;
      const bounds = mapPreviewBounds(level, x, y);
      if (!intersectsBounds(bounds, viewport)) continue;

      let parentX = x,
        parentY = y;
      let coveredByParent = false;
      for (
        let parentLevel = level + 1;
        parentLevel <= mapPreviewMaxLevel;
        parentLevel++
      ) {
        parentX = Math.floor(parentX / 2);
        parentY = Math.floor(parentY / 2);
        if (this.#tiles.has(tileKey(parentLevel, parentX, parentY))) {
          coveredByParent = true;
          break;
        }
      }

      const fade = coveredByParent
        ? Math.min(1, (performance.now() - tile.created) / 180)
        : 1;
      this.#drawPreviewTile(ctx, tile.image, bounds, fade);
      if (fade < 1) this.changed();
      this.#tiles.delete(key);
      this.#tiles.set(key, tile);
      drawn = true;
    }

    return drawn;
  }

  /** Рисует обзорный тайл с учётом экранного преобразования и плавного появления. */
  #drawPreviewTile(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement | HTMLCanvasElement,
    bounds: WorldBounds,
    fade: number,
  ) {
    const transform = ctx.getTransform();
    const left = Math.round(bounds.x * transform.a + transform.e);
    const top = Math.round(bounds.y * transform.d + transform.f);
    const right = Math.round(
      (bounds.x + bounds.width) * transform.a + transform.e,
    );
    const bottom = Math.round(
      (bounds.y + bounds.height) * transform.d + transform.f,
    );
    if (right <= left || bottom <= top) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (fade === 1) ctx.clearRect(left, top, right - left, bottom - top);
    ctx.globalAlpha *= fade;
    ctx.drawImage(image, left, top, right - left, bottom - top);
    ctx.restore();
  }

  /** Проверяет, доступен ли обзорный тайл для заданных границ. */
  hasOverviewFor(bounds: WorldBounds): boolean {
    const targetLevel = this.#viewportPreviewLevel(this.#coords.worldViewport);
    for (let level = targetLevel; level <= mapPreviewMaxLevel; level++) {
      const size = mapChunkSize * 2 ** level;
      const x = Math.floor(bounds.x / size),
        y = Math.floor(bounds.y / size);
      if (
        x !== Math.ceil((bounds.x + bounds.width) / size) - 1 ||
        y !== Math.ceil((bounds.y + bounds.height) / size) - 1
      )
        continue;
      if (this.#tiles.has(tileKey(level, x, y))) return true;
    }
    return false;
  }

  /** Проверяет, завершена ли загрузка данных сцены для заданной области. */
  ready(bounds: WorldBounds) {
    if (!this.#header) return true;
    if (!this.#covered.some((area) => contains(area, bounds))) return false;
    return [...this.#pages].every(
      ([key, page]) =>
        !intersectsBounds(page.bounds, bounds) || this.#loaded.has(key),
    );
  }

  /** Обновляет данные сцены, необходимые для текущего окна просмотра. */
  update(viewport: WorldBounds) {
    this.canEditViewport.set(!this.#saving && this.ready(viewport));
    if (!this.#header || this.#mapId === null) return;

    this.#scheduleViewportTiles(viewport);
    if (!this.#forceDetails && this.#coords.zoom * mapChunkSize < 80) return;

    const margin = Math.min(
      mapChunkSize,
      Math.max(viewport.width, viewport.height) * 0.3,
    );
    const step = mapChunkSize * 4;
    const left = Math.max(
      -mapWorldHalfSize,
      Math.floor((viewport.x - margin) / step) * step,
    );
    const top = Math.max(
      -mapWorldHalfSize,
      Math.floor((viewport.y - margin) / step) * step,
    );
    const right = Math.min(
      mapWorldHalfSize,
      Math.ceil((viewport.x + viewport.width + margin) / step) * step,
    );
    const bottom = Math.min(
      mapWorldHalfSize,
      Math.ceil((viewport.y + viewport.height + margin) / step) * step,
    );
    const area = { x: left, y: top, width: right - left, height: bottom - top };
    if (area.width > mapChunkSize * 64 || area.height > mapChunkSize * 64)
      return;

    const missingPages = [...this.#pages].some(
      ([key, page]) =>
        intersectsBounds(page.bounds, area) && !this.#loaded.has(key),
    );
    if (
      (!this.#covered.some((item) => contains(item, area)) || missingPages) &&
      this.#discovering.size < 2
    )
      void this.#discover(area, true).catch(() => undefined);

    if (this.#loaded.size > 64) this.#evict(area);
  }

  /** Сбрасывает состояния ошибок и повторно запрашивает недостающие данные. */
  retry() {
    this.#tileMissing.clear();
    this.#tileFailed.clear();
    this.#tileBlockFailed.clear();
    this.#tilePackFailed.clear();
    this.#tileRequestSignature = '';
    this.error.set('');
    this.changed();
  }

  /** Принудительно включает загрузку подробных данных текущей области. */
  loadViewportDetails() {
    this.#forceDetails = true;
    this.retry();
  }

  /** Начинает локальный черновик для авторизованного пользователя. */
  beginLocalDraft() {
    const accountId = this.#account.user()?.id;
    if (accountId !== undefined) this.#activateJournal(undefined, 0);
  }

  /** Активирует журнал локальных операций для текущего документа и ревизии. */
  #activateJournal(mapId: number | undefined, revision: number) {
    const accountId = this.#account.user()?.id;
    if (accountId === undefined) return;
    const journal = new SceneOperationJournal(() =>
      this.error.set(
        'Не удалось записать изменение карты в браузере. Повторите сохранение.',
      ),
    );
    journal.activate(accountId, mapId, revision);
    this.#journal = journal;
    this.#storage.persistCompletedOperation = (mutation, direction) => {
      try {
        journal.capture(mutation, direction);
      } catch (error) {
        this.#journalCaptureError =
          error instanceof Error
            ? error
            : new Error('Local scene capture failed');
        this.error.set(
          'Не удалось подготовить изменение карты для локального сохранения.',
        );
      }
    };
  }

  /**
   * Сохраняет изменения сцены в указанную карту.
   *
   * @param id Идентификатор карты, в которую сохраняется сцена.
   * @param copy Признак сохранения как новой копии.
   */
  async save(id: number, copy = false) {
    if (this.#saving) return;

    if (this.#draftRecoveryError)
      throw new Error('Restore the local draft before saving this map');

    const accountId = this.#account.user()?.id;
    if (accountId === undefined) throw new Error('Sign in to save a map');

    this.#saving = true;
    this.canEditViewport.set(false);
    this.saveProgress.set(0);
    this.#saveFetchedCells.clear();

    try {
      if (!this.#journal) {
        const sourceCopy = copy && this.#mapId !== null && this.#mapId !== id;
        this.#activateJournal(
          this.#header && !sourceCopy ? (this.#mapId ?? undefined) : undefined,
          this.#header && !sourceCopy ? this.revision : 0,
        );
        if (!this.#header || sourceCopy) this.#seedJournal();
      }

      if (this.#journalCaptureError) throw this.#journalCaptureError;
      this.#draftTargetMapId = id;

      const pending = await this.#commits.pending(accountId, id);
      if (pending) this.#preparedCommit = pending;
      await this.#writeDraft();
      if (pending) await this.#publishPrepared(pending);

      const journalCutSeq = await this.#journal?.flush();
      const sourceId =
        copy && this.#mapId !== null && this.#mapId !== id ? this.#mapId : null;
      const initial = this.#header === null;
      const repairPreviews =
        !initial &&
        (this.#header?.previewContentVersion !== 3 ||
          this.#header.previewContentRevision === undefined);
      if (repairPreviews && this.#header)
        await this.#discover(this.#header.bounds, true);

      const prepared = await this.#preparePages(initial);
      const containers = this.#containerChanges();
      const changedContainers = containers.some(
        (item) =>
          JSON.stringify(item) !==
          JSON.stringify(this.#baselineContainers.get(item.id)),
      );
      if (
        !initial &&
        sourceId === null &&
        !prepared.uploads.length &&
        !changedContainers &&
        !repairPreviews
      ) {
        this.saveProgress.set(100);
        return;
      }

      const containerBounds = await this.#changedContainerBounds(containers);
      const images = await this.#preparePreviewTiles(
        this.#dirtyPreviewKeys(
          prepared.uploads,
          prepared.oldBounds,
          containerBounds,
          repairPreviews
            ? [...this.#pages.values()].map((page) => page.bounds)
            : [],
        ),
        repairPreviews,
      );
      const previewContentRevision =
        sourceId !== null
          ? 1
          : this.#header?.previewContentVersion === 3 &&
              this.#header.previewContentRevision !== undefined
            ? this.#header.previewContentRevision
            : this.revision + 1;

      const commit: PreparedSceneCommit = {
        version: 1,
        accountId,
        mapId: id,
        idempotencyKey: crypto.randomUUID(),
        expectedRevision: sourceId !== null || initial ? 0 : this.revision,
        ...(sourceId !== null
          ? { sourceMapId: sourceId, sourceRevision: this.revision }
          : {}),
        header: {
          ...(this.#header ?? createEmptyMapSceneHeader()),
          rootId: this.#storage.nodesRoot().id,
          bounds: this.#contentBounds(),
          bootstrap: [],
          previewContentVersion: 3,
          previewContentRevision,
        },
        pages: prepared.uploads,
        tiles: images.map((tile) => ({
          kind: 'tile',
          level: tile.level,
          x: tile.x,
          y: tile.y,
          png: tile.data,
        })),
        containers,
        records: structuredClone(this.#records()),
        removedIds: [...this.#storage.deletedShapeIds],
        ...(journalCutSeq !== undefined ? { journalCutSeq } : {}),
      };

      await this.#commits.prepare(commit);
      this.#preparedCommit = commit;
      await this.#publishPrepared(commit);
    } finally {
      this.#saveFetchedCells.clear();

      this.#saving = false;
      this.canEditViewport.set(this.ready(this.#coords.worldViewport));
      this.#saveDraft();
    }
  }

  /**
   * Публикует подготовленный коммит и синхронизирует локальное состояние сцены.
   *
   * После ответа сервера обновляет базовые страницы, тайлы, ревизию и черновик.
   */
  async #publishPrepared(commit: PreparedSceneCommit) {
    const { scene: saved, serverCommitId } = await this.#commits.publish(
      commit,
      (value) => this.saveProgress.set(value),
    );
    if (this.#journal && commit.journalCutSeq !== undefined) {
      await this.#journal.bindMap(commit.mapId);
      await this.#journal.acknowledge({
        serverCommitId,
        expectedRevision: commit.expectedRevision,
        publishedRevision: saved.revision,
        cutSeq: commit.journalCutSeq,
      });
    }

    this.#epoch += 1;
    this.#discovering.clear();
    this.loading.set(false);

    if (this.#tileRequestTimer) clearTimeout(this.#tileRequestTimer);
    this.#tileRequestTimer = null;
    this.#tileRequestSignature = '';

    this.#tilePending.clear();
    this.#tileMissing.clear();
    this.#tileFailed.clear();

    this.revision = saved.revision;
    this.#mapId = commit.mapId;
    this.#header = saved;
    this.#forceDetails = false;

    for (const [key, tile] of this.#tiles)
      if (!this.#validPreviewTile(tile.version)) {
        if (tile.url) URL.revokeObjectURL(tile.url);
        this.#tiles.delete(key);
      }

    this.#tileBlocks.clear();
    this.#tileBlockPending.clear();
    this.#tileBlockFailed.clear();
    this.#tilePackPending.clear();
    this.#tilePackFailed.clear();
    this.#availableTiles.clear();
    this.#draftTargetMapId = null;

    this.sceneMapId.set(commit.mapId);
    this.sceneRevision.set(saved.revision);
    this.#storage.sceneBounds = saved.bounds;

    if (commit.expectedRevision === 0 && commit.sourceMapId === undefined)
      this.#covered = [
        {
          x: -mapWorldHalfSize,
          y: -mapWorldHalfSize,
          width: mapWorldHalfSize * 2,
          height: mapWorldHalfSize * 2,
        },
      ];

    for (const upload of commit.pages) {
      const key = pageKey(upload);
      for (const id of this.#pageIds.get(key) ?? [])
        this.#baselineRecords.delete(id);
      this.#pages.delete(key);
      this.#loaded.delete(key);
      this.#pageIds.delete(key);
      this.#clean.delete(key);
      this.#dirtyPages.delete(key);

      if (upload.deleted) continue;
      const records: SerializedChunkShape[] = JSON.parse(upload.body);
      const ids = new Set(records.map((record) => record.shape.id));
      this.#pages.set(key, {
        cellX: upload.cellX,
        cellY: upload.cellY,
        pageId: upload.pageId,
        bounds: {
          x: upload.minX,
          y: upload.minY,
          width: upload.maxX - upload.minX,
          height: upload.maxY - upload.minY,
        },
      });
      this.#pageIds.set(key, ids);
      this.#loaded.add(key);
      this.#clean.set(key, this.#recordsSignature(records));

      for (const record of records)
        this.#baselineRecords.set(record.shape.id, structuredClone(record));
    }

    for (const id of commit.removedIds)
      this.#storage.deletedShapeIds.delete(id);

    for (const container of commit.containers) {
      if (container.deleted) {
        this.#knownContainers.delete(container.id);
        this.#baselineContainers.delete(container.id);
      } else {
        this.#knownContainers.add(container.id);
        this.#baselineContainers.set(container.id, container);
      }
    }

    for (const tile of commit.tiles) {
      const key = tileKey(tile.level, tile.x, tile.y);
      const previous = this.#tiles.get(key);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      this.#tiles.delete(key);
      this.#tileMissing.delete(key);
      if (
        !intersectsBounds(
          mapPreviewBounds(tile.level, tile.x, tile.y),
          this.#coords.worldViewport,
        )
      )
        continue;
      const url = URL.createObjectURL(tile.png);
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      this.#tiles.set(key, {
        image,
        url,
        created: performance.now(),
        version: saved.revision,
      });
      this.#pruneTiles();
    }

    this.#storage.persistRemoteDraft = () => this.#saveDraft();
    this.#preparedCommit = null;
    this.#recoveryBaseRevision = null;
    await this.#writeDraft();

    await this.#commits.acknowledge(commit);
    this.saveProgress.set(100);
    this.changed();
  }

  /** Добавляет исходные фигуры в журнал при начале локального черновика. */
  #seedJournal() {
    const journal = this.#journal;
    if (!journal) return;
    const current = JSON.parse(this.#storage.exportSnapshot()) as {
      version: number;
      shapes: unknown[];
      nodes: { children: unknown[] };
    };
    const empty = JSON.stringify({
      ...current,
      shapes: [],
      nodes: { ...current.nodes, children: [] },
    });
    const bounds = new Map(
      [...this.#storage.shapes].map(([shapeId, shape]) => [
        shapeId,
        { ...shape.getBounds() },
      ]),
    );
    const mutation = createSceneMutation(
      empty,
      JSON.stringify(current),
      new Map(),
      bounds,
    );
    journal.capture(mutation, 'redo');
  }

  /** Ищет фигуры сцены по тексту в пределах загруженных данных. */
  searchObjects(
    bounds: WorldBounds,
    kind: string,
    query: string,
    scope: 'viewport' | 'map',
    cursor?: string,
  ) {
    const mapId = this.#mapId;
    if (mapId === null)
      return Promise.resolve<SceneObjectPage>({
        items: [],
        nextCursor: null,
        complete: true,
      });
    return firstValueFrom(
      this.#http.get<SceneObjectPage>(`/api/maps/${mapId}/objects`, {
        params: {
          ...bounds,
          revision: this.revision,
          limit: 100,
          scope,
          ...(kind ? { kind } : {}),
          ...(query ? { query } : {}),
          ...(cursor ? { cursor } : {}),
        },
      }),
    );
  }

  /** Загружает описание страниц сцены для указанной области мира. */
  async #discover(area: WorldBounds, withBodies = false) {
    const id = this.#mapId;
    if (id === null) return;

    const x = Math.max(-mapWorldHalfSize, area.x);
    const y = Math.max(-mapWorldHalfSize, area.y);
    const right = Math.min(mapWorldHalfSize, area.x + area.width);
    const bottom = Math.min(mapWorldHalfSize, area.y + area.height);
    if (right <= x || bottom <= y) return;

    area = { x, y, width: right - x, height: bottom - y };
    const signature = `${withBodies}:${JSON.stringify(area)}`;
    const pending = this.#discovering.get(signature);
    if (pending) return pending;

    const request = (async () => {
      const epoch = this.#epoch;
      let cursor: string | null = null;
      let count = 0;

      try {
        do {
          const result: PageResponse = await firstValueFrom(
            this.#http.get<PageResponse>(`/api/maps/${id}/chunks`, {
              params: {
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
                revision: this.revision,
                limit: withBodies ? 24 : 100,
                ...(withBodies ? { includeBody: 'true' } : {}),
                ...(cursor ? { cursor } : {}),
              },
            }),
          );
          if (epoch !== this.#epoch) return;

          for (const page of result.items) {
            const { body, ...descriptor } = page;
            const key = pageKey(descriptor);
            this.#pages.set(key, descriptor);
            if (withBodies && !this.#loaded.has(key)) {
              if (typeof body !== 'string')
                throw new Error('Map page body is missing');
              await this.#importPageBody(key, body, epoch);
            }
          }

          count += result.items.length;
          if (count > 1024) throw new Error('Too many pages in the viewport');
          cursor = result.nextCursor;
        } while (cursor);
        this.#covered.push(area);
        if (this.#covered.length > 64) this.#covered.shift();
        this.changed();
      } catch {
        if (epoch === this.#epoch)
          this.error.set(
            'Не удалось загрузить область карты. Приблизьте её или повторите загрузку.',
          );
        throw new Error('Map viewport discovery failed');
      } finally {
        if (epoch === this.#epoch) {
          this.#discovering.delete(signature);
          this.loading.set(
            [...this.#discovering.keys()].some((key) =>
              key.startsWith('true:'),
            ),
          );
        }
      }
    })();
    this.#discovering.set(signature, request);
    if (withBodies) this.loading.set(true);
    return request;
  }

  /** Загружает недостающие контейнеры, необходимые для указанных узлов. */
  async #ensureParents(parentIds: string[], overwrite = false) {
    const id = this.#mapId;
    if (id === null) return;

    const epoch = this.#epoch;
    for (const parentId of parentIds) {
      if (epoch !== this.#epoch) return;
      if (this.#baselineContainers.has(parentId)) continue;

      const path = await firstValueFrom(
        this.#http.get<ContainerRecord[]>(
          `/api/maps/${id}/containers/${encodeURIComponent(parentId)}`,
          { params: { revision: this.revision } },
        ),
      );
      if (epoch !== this.#epoch) return;

      this.#storage.importSceneContainers(path, overwrite);
      for (const item of path) {
        this.#knownContainers.add(item.id);
        this.#baselineContainers.set(item.id, {
          ...item,
          parentId: item.parentId ?? undefined,
          kind: item.kind === 'layer' ? 'layer' : 'group',
        });
      }
    }
  }

  /** Планирует загрузку обзорных тайлов для текущей области просмотра. */
  #scheduleViewportTiles(viewport: WorldBounds) {
    if (this.revision === 0) return;
    const level = this.#viewportPreviewLevel(viewport);
    const size = mapChunkSize * 2 ** level;
    const signature =
      `${level}:${Math.floor(viewport.x / size)}:${Math.floor(viewport.y / size)}:` +
      `${Math.ceil((viewport.x + viewport.width) / size)}:${Math.ceil((viewport.y + viewport.height) / size)}`;
    if (signature === this.#tileRequestSignature) return;
    this.#tileRequestSignature = signature;
    if (this.#tileRequestTimer) clearTimeout(this.#tileRequestTimer);
    this.#tileRequestTimer = setTimeout(() => {
      this.#tileRequestTimer = null;
      this.#requestViewportTiles(this.#coords.worldViewport);
    }, 120);
  }

  /** Запрашивает недостающие тайлы и ограничивает параллельные обращения. */
  #requestViewportTiles(viewport: WorldBounds) {
    if (this.#tileRequestTimer || !this.#tileRequestSignature) return;
    if (this.revision === 0) return;

    const level = this.#viewportPreviewLevel(viewport);
    const size = mapChunkSize * 2 ** level;
    const wanted: { x: number; y: number }[] = [];
    for (
      let y = Math.max(-mapWorldHalfSize / size, Math.floor(viewport.y / size));
      y <
      Math.min(
        mapWorldHalfSize / size,
        Math.ceil((viewport.y + viewport.height) / size),
      );
      y++
    )
      for (
        let x = Math.max(
          -mapWorldHalfSize / size,
          Math.floor(viewport.x / size),
        );
        x <
        Math.min(
          mapWorldHalfSize / size,
          Math.ceil((viewport.x + viewport.width) / size),
        );
        x++
      ) {
        if (
          this.#header &&
          !intersectsBounds(mapPreviewBounds(level, x, y), this.#header.bounds)
        )
          continue;
        wanted.push({ x, y });
      }

    const packs = new Map<string, { x: number; y: number; mask: number }>();
    for (const { x, y } of wanted) {
      const packX = Math.floor(x / 2) * 2,
        packY = Math.floor(y / 2) * 2;
      const key = tileKey(level, packX, packY);
      const current = packs.get(key);
      const mask = 1 << ((y - packY) * 2 + x - packX);
      packs.set(key, { x: packX, y: packY, mask: (current?.mask ?? 0) | mask });
    }

    for (const [key, pack] of packs) {
      if (this.#tilePackPending.size >= 2) break;
      if (this.#tilePackPending.has(key) || this.#tilePackFailed.has(key))
        continue;
      let complete = true;
      for (let dy = 0; dy < 2 && complete; dy++)
        for (let dx = 0; dx < 2; dx++) {
          if (!(pack.mask & (1 << (dy * 2 + dx)))) continue;
          const tile = tileKey(level, pack.x + dx, pack.y + dy);
          if (!this.#tiles.has(tile) && !this.#tileMissing.has(tile)) {
            complete = false;
            break;
          }
        }
      if (!complete) void this.#fetchTilePack(level, pack.x, pack.y, pack.mask);
    }
  }

  /** Загружает стартовые тайлы превью, включённые в заголовок сцены. */
  async #loadBootstrapTiles(tiles: readonly MapPreviewDescriptor[]) {
    const packs = new Map<
      string,
      { level: number; x: number; y: number; mask: number }
    >();
    for (const tile of tiles) {
      const x = Math.floor(tile.x / 2) * 2,
        y = Math.floor(tile.y / 2) * 2;
      const key = tileKey(tile.level, x, y);
      const current = packs.get(key);
      const mask = 1 << ((tile.y - y) * 2 + tile.x - x);
      packs.set(key, {
        level: tile.level,
        x,
        y,
        mask: (current?.mask ?? 0) | mask,
      });
    }
    const entries = [...packs.values()];
    for (let index = 0; index < entries.length; index += 2)
      await Promise.all(
        entries
          .slice(index, index + 2)
          .map((pack) =>
            this.#fetchTilePack(pack.level, pack.x, pack.y, pack.mask),
          ),
      );
  }

  /** Загружает пакет тайлов и обновляет кэш доступных превью. */
  async #fetchTilePack(
    level: number,
    x: number,
    y: number,
    mask: number,
  ): Promise<void> {
    const mapId = this.#mapId;
    if (mapId === null || this.revision === 0) return;

    const key = tileKey(level, x, y);
    const pending = this.#tilePackPending.get(key);
    if (pending) return pending;

    const epoch = this.#epoch,
      revision = this.revision;
    const request = (async () => {
      const decoded: { key: string; tile: TileImage }[] = [];

      try {
        const bytes = await firstValueFrom(
          this.#http.get(`/api/maps/${mapId}/tile-packs/${level}/${x}/${y}`, {
            responseType: 'arraybuffer',
            params: { revision, mask },
          }),
        );
        if (epoch !== this.#epoch || revision !== this.revision) return;

        if (bytes.byteLength < 4) throw new Error('Invalid tile pack');
        const view = new DataView(bytes);
        const count = view.getUint32(0, true);
        if (count > 4) throw new Error('Invalid tile pack');

        const received = new Set<string>();
        const unavailable = new Set<string>();
        let offset = 4;

        for (let index = 0; index < count; index++) {
          if (offset + 16 > bytes.byteLength)
            throw new Error('Invalid tile pack');
          const tileX = view.getInt32(offset, true),
            tileY = view.getInt32(offset + 4, true);
          const version = view.getUint32(offset + 8, true),
            length = view.getUint32(offset + 12, true);
          offset += 16;
          const tileId = tileKey(level, tileX, tileY);
          if (
            tileX < x ||
            tileX >= x + 2 ||
            tileY < y ||
            tileY >= y + 2 ||
            !(mask & (1 << ((tileY - y) * 2 + tileX - x))) ||
            received.has(tileId) ||
            length > 350_000 ||
            offset + length > bytes.byteLength
          )
            throw new Error('Invalid tile pack');
          received.add(tileId);
          if (!this.#validPreviewTile(version)) unavailable.add(tileId);
          else if (!this.#tiles.has(tileId)) {
            const url = URL.createObjectURL(
              new Blob([bytes.slice(offset, offset + length)], {
                type: 'image/png',
              }),
            );
            const image = new Image();
            image.src = url;

            try {
              await image.decode();
            } catch {
              URL.revokeObjectURL(url);
              throw new Error('Invalid preview image');
            }
            decoded.push({
              key: tileId,
              tile: {
                image: this.#transparentPreviewBackground(image),
                url,
                created: performance.now(),
                version,
              },
            });
          }

          offset += length;
        }

        if (offset !== bytes.byteLength) throw new Error('Invalid tile pack');
        if (epoch !== this.#epoch || revision !== this.revision) return;

        for (const item of decoded) {
          if (this.#tiles.has(item.key)) {
            if (item.tile.url) URL.revokeObjectURL(item.tile.url);
            continue;
          }
          this.#tiles.set(item.key, item.tile);
          this.#availableTiles.set(item.key, item.tile.version);
        }

        for (const tileId of unavailable) this.#tileMissing.add(tileId);

        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            if (!(mask & (1 << (dy * 2 + dx)))) continue;
            const tileId = tileKey(level, x + dx, y + dy);
            if (!received.has(tileId)) this.#tileMissing.add(tileId);
          }

        decoded.length = 0;
        this.#pruneTiles();
        this.changed();
      } catch {
        if (epoch === this.#epoch && revision === this.revision) {
          this.#tilePackFailed.add(key);
          this.error.set('Не удалось загрузить обзорные тайлы карты.');
        }
      } finally {
        for (const item of decoded)
          if (item.tile.url) URL.revokeObjectURL(item.tile.url);

        if (epoch === this.#epoch && revision === this.revision) {
          this.#tilePackPending.delete(key);
          this.#requestViewportTiles(this.#coords.worldViewport);
        }
      }
    })();
    this.#tilePackPending.set(key, request);
    return request;
  }

  /** Выбирает уровень тайлов, подходящий текущему масштабу и области. */
  #viewportPreviewLevel(viewport: WorldBounds) {
    const projected = Math.max(this.#coords.zoom, 0.000_001) * mapChunkSize;
    let level = Math.min(
      mapPreviewMaxLevel,
      Math.max(0, Math.ceil(Math.log2(128 / projected))),
    );
    while (level < mapPreviewMaxLevel) {
      const size = mapChunkSize * 2 ** level;
      const count =
        (Math.ceil((viewport.x + viewport.width) / size) -
          Math.floor(viewport.x / size)) *
        (Math.ceil((viewport.y + viewport.height) / size) -
          Math.floor(viewport.y / size));
      if (count <= 16) break;
      level += 1;
    }
    return level;
  }

  /** Проверяет, соответствует ли версия тайла открытой сцене. */
  #validPreviewTile(version: number) {
    return (
      this.#header?.previewContentVersion !== 3 ||
      version >= (this.#header.previewContentRevision ?? 0)
    );
  }

  /** Загружает блок тайлов, содержащий обзорный тайл заданного уровня. */
  async #loadTileBlock(level: number, x: number, y: number) {
    const mapId = this.#mapId;
    if (mapId === null) return;

    const blockKey = tileKey(level, x, y);
    const epoch = this.#epoch,
      revision = this.revision;
    const request = (async () => {
      try {
        const tiles = await firstValueFrom(
          this.#http.get<MapPreviewDescriptor[]>(`/api/maps/${mapId}/tiles`, {
            params: { level, x, y, revision },
          }),
        );
        if (epoch !== this.#epoch || revision !== this.revision) return;

        for (const tile of tiles)
          if (this.#validPreviewTile(tile.version))
            this.#availableTiles.set(
              tileKey(tile.level, tile.x, tile.y),
              tile.version,
            );

        this.#tileBlocks.add(blockKey);
      } catch {
        if (epoch === this.#epoch && revision === this.revision) {
          this.#tileBlockFailed.add(blockKey);
          this.error.set('Не удалось загрузить список обзорных тайлов карты.');
        }
      } finally {
        if (epoch === this.#epoch && revision === this.revision) {
          this.#tileBlockPending.delete(blockKey);
          this.#requestViewportTiles(this.#coords.worldViewport);
        }
      }
    })();
    this.#tileBlockPending.set(blockKey, request);
    return request;
  }

  /** Загружает один обзорный тайл с защитой от повторных запросов. */
  async #fetchTile(
    level: number,
    x: number,
    y: number,
    knownVersion?: number,
  ): Promise<TileImage | null> {
    if (this.revision === 0) return null;

    const key = tileKey(level, x, y);
    const tileVersion = knownVersion ?? this.#availableTiles.get(key) ?? 0;
    if (!this.#validPreviewTile(tileVersion)) return null;
    if (this.#tiles.has(key)) return this.#tiles.get(key) ?? null;
    if (this.#tileMissing.has(key) || this.#mapId === null) return null;

    const pending = this.#tilePending.get(key);
    if (pending) return pending;

    const epoch = this.#epoch,
      revision = this.revision;
    const request = (async () => {
      try {
        const blob = await firstValueFrom(
          this.#http.get(`/api/maps/${this.#mapId}/tiles/${level}/${x}/${y}`, {
            responseType: 'blob',
            params: { revision },
          }),
        );
        if (epoch !== this.#epoch || revision !== this.revision) return null;

        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.src = url;

        try {
          await image.decode();
        } catch {
          URL.revokeObjectURL(url);
          throw new Error('Invalid preview image');
        }

        if (epoch !== this.#epoch || revision !== this.revision) {
          URL.revokeObjectURL(url);
          return null;
        }

        const tile: TileImage = {
          image: this.#transparentPreviewBackground(image),
          url,
          created: performance.now(),
          version: tileVersion,
        };
        this.#tiles.set(key, tile);
        this.changed();
        this.#pruneTiles();

        return tile;
      } catch (error) {
        if (epoch === this.#epoch && revision === this.revision) {
          this.#tileMissing.add(key);
          if (!(error instanceof HttpErrorResponse && error.status === 404)) {
            this.#tileFailed.add(key);
            this.error.set('Не удалось загрузить обзор карты.');
          }
        }
        return null;
      } finally {
        if (epoch === this.#epoch && revision === this.revision) {
          this.#tilePending.delete(key);
          this.#requestViewportTiles(this.#coords.worldViewport);
        }
      }
    })();
    this.#tilePending.set(key, request);
    return request;
  }

  /** Создаёт прозрачную подложку для тайла без опубликованного изображения. */
  #transparentPreviewBackground(
    image: HTMLImageElement,
  ): HTMLImageElement | HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return image;

    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 3; index < pixels.data.length; index += 4)
      if (pixels.data[index] < 255) return image;

    ctx.fillStyle = canvasColor('--workshop-map-bg-color');
    ctx.fillRect(0, 0, 1, 1);
    const background = ctx.getImageData(0, 0, 1, 1).data;
    let removed = false;

    for (let index = 0; index < pixels.data.length; index += 4) {
      if (
        pixels.data[index + 3] !== 255 ||
        pixels.data[index] !== background[0] ||
        pixels.data[index + 1] !== background[1] ||
        pixels.data[index + 2] !== background[2]
      )
        continue;
      pixels.data[index + 3] = 0;
      removed = true;
    }
    if (!removed) return image;
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }

  /** Проверяет наличие тайла в опубликованном превью карты. */
  async #hasSavedTile(level: number, x: number, y: number) {
    if (this.revision === 0) return false;
    const key = tileKey(level, x, y);
    if (this.#tiles.has(key) || this.#availableTiles.has(key)) return true;
    if (this.#tileMissing.has(key)) return false;
    const blockX = Math.floor(x / 8) * 8,
      blockY = Math.floor(y / 8) * 8;
    const blockKey = tileKey(level, blockX, blockY);
    if (!this.#tileBlocks.has(blockKey) && !this.#tileBlockFailed.has(blockKey))
      await (this.#tileBlockPending.get(blockKey) ??
        this.#loadTileBlock(level, blockX, blockY));
    if (this.#tileBlockFailed.has(blockKey))
      throw new Error('Не удалось проверить обзорные тайлы карты');
    return this.#availableTiles.has(key);
  }

  /** Удаляет из кэша самые старые тайлы при превышении его лимита. */
  #pruneTiles() {
    if (this.#tiles.size <= this.#maxTiles) return;
    const viewport = this.#coords.worldViewport;
    for (const [key, tile] of this.#tiles) {
      if (this.#tiles.size <= this.#maxTiles) break;
      const [level, x, y] = key.split(':').map(Number);
      if (intersectsBounds(mapPreviewBounds(level, x, y), viewport)) continue;
      if (tile.url) URL.revokeObjectURL(tile.url);
      this.#tiles.delete(key);
    }
  }

  /** Собирает сериализованные записи загруженных фигур текущей сцены. */
  #records() {
    const metadata = new Map<
      string,
      { node: SerializedNode; parentId: string; index: number }
    >();
    const visit = (node: SerializedNode) =>
      node.children.forEach((child, index) => {
        if (child.type === NodesTypes.SHAPE)
          metadata.set(child.shapeId, {
            node: child,
            parentId: node.id,
            index,
          });
        else visit(child);
      });

    visit(this.#storage.exportNodes());

    return this.#storage.exportShapes().flatMap((shape) => {
      const node = metadata.get(shape.id);
      if (!node) return [];

      const bounds = this.#storage.shapes.get(shape.id)?.getBounds();
      return [
        {
          shape,
          node: node.node as Extract<SerializedNode, { type: 'shape' }>,
          parentId: node.parentId,
          index: node.index,
          ...(bounds
            ? {
                bounds: {
                  ...bounds,
                  width: Math.max(1, bounds.width),
                  height: Math.max(1, bounds.height),
                },
              }
            : {}),
        },
      ];
    });
  }

  /** Строит контрольную подпись выбранных фигур для сравнения страниц. */
  #signature(ids: ReadonlySet<string>) {
    const shapes = this.#storage
      .exportShapes(ids)
      .map((shape) => ({ ...shape, selected: false }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const nodes = [...this.#storage.nodes.values()]
      .filter(
        (node): node is ShapeNode =>
          node instanceof ShapeNode && ids.has(node.shape.id),
      )
      .map((node) => ({
        id: node.id,
        parent: node.parent?.id,
        visible: node.visible,
        locked: node.locked,
        zIndex: node.zIndex,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify({ shapes, nodes });
  }

  /** Строит контрольную подпись сериализованных записей страницы. */
  #recordsSignature(records: readonly SerializedChunkShape[]) {
    const shapes = records
      .map((record) => ({ ...record.shape, selected: false }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const nodes = records
      .map((record) => ({
        id: record.node.id,
        parent: record.parentId,
        visible: record.node.visible,
        locked: record.node.locked ?? false,
        zIndex: record.node.zIndex,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify({ shapes, nodes });
  }

  /** Подготавливает страницы сцены из текущего локального состояния. */
  async #preparePages(initial: boolean) {
    const affectedCells = new Set<string>();

    if (!initial) {
      for (const [key, ids] of this.#pageIds)
        if (
          this.#loaded.has(key) &&
          this.#signature(ids) !== this.#clean.get(key)
        ) {
          const page = this.#pages.get(key);
          if (page) affectedCells.add(cellKey(page.cellX, page.cellY));
        }
      for (const key of this.#dirtyPages) {
        affectedCells.add(key.substring(0, key.lastIndexOf(':')));
        const page = this.#pages.get(key);
        if (page) affectedCells.add(cellKey(page.cellX, page.cellY));
      }
    }

    const sourceById = new Map<string, string>();
    for (const [key, ids] of this.#pageIds)
      for (const id of ids) sourceById.set(id, key);

    for (const record of this.#records()) {
      const shape = this.#storage.shapes.get(record.shape.id);
      if (!shape) continue;
      const bounds = shape.getBounds();
      if (
        bounds.x < -mapWorldHalfSize ||
        bounds.y < -mapWorldHalfSize ||
        bounds.x + bounds.width > mapWorldHalfSize ||
        bounds.y + bounds.height > mapWorldHalfSize
      )
        throw new Error('Объект находится за пределами карты');

      const target = cellKey(mapCellOf(bounds.x), mapCellOf(bounds.y));
      const source = sourceById.get(shape.id);
      if (initial || !source || !source.startsWith(`${target}:`)) {
        affectedCells.add(target);
        if (source)
          affectedCells.add(source.substring(0, source.lastIndexOf(':')));
      }
    }

    if (!initial) {
      await this.#ensureCellsGeometry(affectedCells);
    }

    const groups = new Map<
      string,
      { records: SerializedChunkShape[]; bounds: WorldBounds }
    >();
    for (const record of this.#records()) {
      const shape = this.#storage.shapes.get(record.shape.id);
      if (!shape) continue;
      const bounds = shape.getBounds();
      const cell = cellKey(mapCellOf(bounds.x), mapCellOf(bounds.y));
      if (!affectedCells.has(cell)) continue;
      const group = groups.get(cell) ?? { records: [], bounds: { ...bounds } };
      group.records.push(record);
      group.bounds = unionBounds(group.bounds, bounds);
      groups.set(cell, group);
    }

    const uploads: PageUpload[] = [];
    const affected = new Set<string>();
    const oldBounds = new Map<string, WorldBounds>();
    for (const [key, page] of this.#pages)
      if (affectedCells.has(cellKey(page.cellX, page.cellY))) {
        affected.add(key);
        oldBounds.set(key, page.bounds);
      }

    for (const [cell, group] of groups) {
      const [cellX, cellY] = cell.split(':').map(Number);
      group.records.sort((a, b) => a.shape.id.localeCompare(b.shape.id));
      let pageId = 0,
        batch: SerializedChunkShape[] = [],
        batchLength = 2;
      const flush = () => {
        if (!batch.length) return;
        const bounds = batch
          .map((item) => this.#storage.shapes.get(item.shape.id)?.getBounds())
          .filter((item): item is WorldBounds => item !== undefined)
          .reduce(unionBounds);
        const body = JSON.stringify(batch);
        uploads.push({
          kind: 'page',
          cellX,
          cellY,
          pageId,
          minX: bounds.x,
          minY: bounds.y,
          maxX: bounds.x + Math.max(1, bounds.width),
          maxY: bounds.y + Math.max(1, bounds.height),
          body,
        });
        affected.add(pageKey({ cellX, cellY, pageId }));
        pageId += 1;
        batch = [];
        batchLength = 2;
      };

      for (const record of group.records) {
        const recordLength = utf8.encode(JSON.stringify(record)).byteLength;
        if (recordLength > 240_000)
          throw new Error('Объект слишком велик для одной страницы карты');

        if (
          batch.length >= 500 ||
          batchLength + recordLength + (batch.length ? 1 : 0) > 240_000
        )
          flush();

        batchLength += recordLength + (batch.length ? 1 : 0);
        batch.push(record);
      }
      flush();
    }

    const replacements = new Set(uploads.map(pageKey));
    for (const key of affected) {
      if (replacements.has(key)) continue;
      const page = this.#pages.get(key);
      if (!page) continue;
      uploads.push({
        kind: 'page',
        cellX: page.cellX,
        cellY: page.cellY,
        pageId: page.pageId,
        minX: page.bounds.x,
        minY: page.bounds.y,
        maxX: page.bounds.x + page.bounds.width,
        maxY: page.bounds.y + page.bounds.height,
        body: '[]',
        deleted: true,
      });
    }
    return { uploads, affected, oldBounds };
  }

  /** Вычисляет границы областей, затронутых изменением контейнеров. */
  async #changedContainerBounds(containers: SceneContainerChange[]) {
    const mapId = this.#mapId;
    if (mapId === null || !this.#header) return [];

    const bounds: WorldBounds[] = [];
    for (const container of containers) {
      const baseline = this.#baselineContainers.get(container.id);
      if (
        !baseline ||
        (!container.deleted &&
          baseline.visible === container.visible &&
          baseline.parentId === container.parentId &&
          baseline.orderKey === container.orderKey &&
          baseline.childIndex === container.childIndex)
      )
        continue;

      const coverage = await firstValueFrom(
        this.#http.get<{ bounds: WorldBounds | null }>(
          `/api/maps/${mapId}/containers/${encodeURIComponent(container.id)}/coverage`,
          { params: { revision: this.revision } },
        ),
      );

      if (coverage.bounds) bounds.push(coverage.bounds);
    }

    return bounds;
  }

  /** Находит тайлы превью, которые нужно перестроить после изменений сцены. */
  #dirtyPreviewKeys(
    uploads: PageUpload[],
    oldBounds: Map<string, WorldBounds>,
    containerBounds: WorldBounds[],
    repairBounds: WorldBounds[] = [],
  ) {
    const leaves = new Set<string>();

    const add = (bounds: WorldBounds) => {
      const left = mapCellOf(bounds.x),
        top = mapCellOf(bounds.y);
      const right = Math.ceil((bounds.x + bounds.width) / mapChunkSize) - 1;
      const bottom = Math.ceil((bounds.y + bounds.height) / mapChunkSize) - 1;
      if ((right - left + 1) * (bottom - top + 1) > 4096)
        throw new Error('Слишком большая область изменения');

      for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++) {
          leaves.add(tileKey(0, x, y));
          if (leaves.size > 4096)
            throw new Error(
              'Слишком много затронутых тайлов за одно сохранение',
            );
        }
    };

    for (const bounds of oldBounds.values()) add(bounds);
    for (const bounds of containerBounds) add(bounds);
    for (const bounds of repairBounds) add(bounds);
    for (const page of uploads)
      if (!page.deleted)
        add({
          x: page.minX,
          y: page.minY,
          width: page.maxX - page.minX,
          height: page.maxY - page.minY,
        });

    return leaves;
  }

  /** Перерисовывает изменённые обзорные тайлы и собирает их родительские уровни. */
  async #preparePreviewTiles(leaves: Set<string>, rebuildAllPreviews = false) {
    const result: { level: number; x: number; y: number; data: Blob }[] = [];
    const prepared = new Map<string, Blob>();
    let totalBytes = 0;

    const dirtyByLevel = [leaves];
    for (let level = 0; level < mapPreviewMaxLevel; level++) {
      const next = new Set<string>();
      for (const key of dirtyByLevel[level]) {
        const [, x, y] = key.split(':').map(Number);
        next.add(tileKey(level + 1, Math.floor(x / 2), Math.floor(y / 2)));
      }
      dirtyByLevel.push(next);
    }

    if (dirtyByLevel.reduce((count, level) => count + level.size, 0) > 10_000) {
      throw new Error('Слишком много тайлов превью за одно сохранение');
    }
    if (!rebuildAllPreviews)
      await this.#ensureCellsGeometry(
        new Set(
          [...leaves].map((key) => {
            const [, x, y] = key.split(':').map(Number);
            return cellKey(x, y);
          }),
        ),
      );

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    let processed = 0;
    for (let level = 0; level <= mapPreviewMaxLevel; level++) {
      for (const key of dirtyByLevel[level]) {
        const [, x, y] = key.split(':').map(Number);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 256, 256);
        if (level === 0) {
          const bounds = mapPreviewBounds(0, x, y);
          await this.#readyGeometry(bounds);
          ctx.setTransform(1 / 8, 0, 0, 1 / 8, -bounds.x / 8, -bounds.y / 8);
          this.#drawScene(ctx, bounds);
        } else {
          for (let cy = 0; cy < 2; cy++)
            for (let cx = 0; cx < 2; cx++) {
              const childX = x * 2 + cx,
                childY = y * 2 + cy;
              const dirty = prepared.get(tileKey(level - 1, childX, childY));
              if (dirty) {
                const image = await createImageBitmap(dirty);
                try {
                  ctx.drawImage(image, cx * 128, cy * 128, 128, 128);
                } finally {
                  image.close();
                }
              } else if (!rebuildAllPreviews) {
                const childKey = tileKey(level - 1, childX, childY);
                const image = (await this.#hasSavedTile(
                  level - 1,
                  childX,
                  childY,
                ))
                  ? (await this.#fetchTile(level - 1, childX, childY))?.image
                  : null;
                if (this.#tileFailed.has(childKey))
                  throw new Error('Could not load source preview tile');
                if (image) ctx.drawImage(image, cx * 128, cy * 128, 128, 128);
              }
            }
        }

        const data = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error('Не удалось создать PNG превью карты')),
            'image/png',
          ),
        );

        if (data.size > 350_000)
          throw new Error('PNG превью тайла превысил лимит сохранения');
        totalBytes += data.size;
        if (totalBytes > 128 * 1024 * 1024)
          throw new Error('Превью карты превысило лимит сохранения');

        prepared.set(key, data);
        result.push({ level, x, y, data });
        if (++processed % 8 === 0)
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    return result;
  }

  /** Импортирует страницу и игнорирует результат устаревшей загрузки. */
  async #importPageBody(key: string, body: string, epoch: number) {
    if (this.#loaded.has(key) || epoch !== this.#epoch) return;

    const data: unknown = JSON.parse(body);
    if (!isMapChunkBody(data)) throw new Error('Invalid page');

    await this.#ensureParents([
      ...new Set(data.map((record) => record.parentId)),
    ]);
    if (epoch !== this.#epoch) return;

    await this.#storage.importChunk(
      JSON.stringify(
        data.filter(
          (record) =>
            !this.#storage.deletedShapeIds.has(record.shape['id'] as string),
        ),
      ),
      () => epoch === this.#epoch,
    );
    if (epoch !== this.#epoch) return;

    const ids = new Set(data.map((record) => record.shape['id'] as string));
    const records = data as unknown as SerializedChunkShape[];
    this.#pageIds.set(key, ids);
    this.#clean.set(key, this.#recordsSignature(records));
    for (const record of records)
      this.#baselineRecords.set(record.shape.id, structuredClone(record));

    this.#loaded.add(key);
  }

  /** Загружает геометрию всех частей, необходимых указанным ячейкам. */
  async #ensureCellsGeometry(cells: ReadonlySet<string>) {
    if (this.#mapId === null || !this.#header || !cells.size) return;
    const groups = new Map<
      string,
      { left: number; top: number; right: number; bottom: number }
    >();
    for (const cell of cells) {
      if (this.#saveFetchedCells.has(cell)) continue;
      const [x, y] = cell.split(':').map(Number);
      const key = `${Math.floor(x / 8)}:${Math.floor(y / 8)}`;
      const current = groups.get(key);
      if (current) {
        current.left = Math.min(current.left, x);
        current.top = Math.min(current.top, y);
        current.right = Math.max(current.right, x);
        current.bottom = Math.max(current.bottom, y);
      } else groups.set(key, { left: x, top: y, right: x, bottom: y });
    }
    for (const group of groups.values()) {
      await this.#discover(
        {
          x: group.left * mapChunkSize,
          y: group.top * mapChunkSize,
          width: (group.right - group.left + 1) * mapChunkSize,
          height: (group.bottom - group.top + 1) * mapChunkSize,
        },
        true,
      );
      for (let y = group.top; y <= group.bottom; y++)
        for (let x = group.left; x <= group.right; x++)
          this.#saveFetchedCells.add(cellKey(x, y));
    }
  }

  /** Дожидается загрузки геометрии, нужной для отрисовки области. */
  async #readyGeometry(bounds: WorldBounds) {
    await Promise.all(
      [...this.#storage.shapes.values()]
        .filter(
          (shape) =>
            (shape.minZoom ?? 0) <= 0 &&
            intersectsBounds(shape.getBounds(), bounds),
        )
        .map((shape) => shape.whenReady()),
    );
  }

  /** Рисует фигуры загруженных страниц, пересекающие заданные границы. */
  #drawScene(ctx: CanvasRenderingContext2D, bounds: WorldBounds) {
    const visit = (node: GraphNode) => {
      if (!node.visible) return;
      if (node instanceof ShapeNode) {
        if (
          (node.shape.minZoom ?? 0) > 0 ||
          !intersectsBounds(node.shape.getBounds(), bounds)
        )
          return;
        node.shape.render(ctx);
        return;
      }
      for (const child of [...node.children].sort(
        (a, b) => a.zIndex - b.zIndex,
      ))
        visit(child);
    };
    visit(this.#storage.nodesRoot());
  }

  /** Формирует список изменённых, удалённых и новых контейнеров сцены. */
  #containerChanges() {
    const current = new Set<string>();
    const changes: {
      id: string;
      parentId?: string;
      kind: 'layer' | 'group';
      name: string;
      visible: boolean;
      locked: boolean;
      orderKey: number;
      childIndex: number;
      deleted?: boolean;
    }[] = [];

    const visit = (node: GraphNode, childIndex: number) => {
      if (node instanceof ShapeNode) return;
      current.add(node.id);
      const raw = 'layerData' in node ? node.layerData : null;
      const name =
        raw &&
        typeof raw === 'object' &&
        'name' in raw &&
        typeof raw.name === 'string'
          ? raw.name
          : 'Группа';
      changes.push({
        id: node.id,
        parentId: node.parent?.id,
        kind: node.type === NodesTypes.LAYER ? 'layer' : 'group',
        name,
        visible: node.visible,
        locked: node.locked,
        orderKey: node.zIndex,
        childIndex,
      });
      node.children.forEach((child, index) => visit(child, index));
    };

    visit(this.#storage.nodesRoot(), 0);
    for (const id of this.#knownContainers)
      if (!current.has(id))
        changes.push({
          id,
          kind: 'group',
          name: '',
          visible: false,
          locked: false,
          orderKey: 0,
          childIndex: 0,
          deleted: true,
        });
    return changes;
  }

  /** Вычисляет итоговые границы карты по загруженным фигурам и контейнерам. */
  #contentBounds() {
    const shapes = [...this.#storage.shapes.values()];
    const local = shapes.length
      ? shapes.map((shape) => shape.getBounds()).reduce(unionBounds)
      : createEmptyMapSceneHeader().bounds;
    const known = this.#storage.sceneBounds ?? this.#header?.bounds;
    return known ? unionBounds(local, known) : local;
  }

  /** Освобождает страницы вне активной области, сохраняя необходимые данные. */
  #evict(area: WorldBounds) {
    for (const [key, page] of this.#pages) {
      if (this.#loaded.size <= 64) break;
      const ids = this.#pageIds.get(key);
      if (!ids || !this.#loaded.has(key) || intersectsBounds(page.bounds, area))
        continue;
      if ([...ids].some((id) => this.#storage.shapes.get(id)?.selected))
        continue;
      if (this.#signature(ids) !== this.#clean.get(key)) continue;

      this.#storage.releaseChunk(ids);
      for (const id of ids) this.#baselineRecords.delete(id);
      this.#loaded.delete(key);
      this.#pageIds.delete(key);
      this.#clean.delete(key);
    }
  }

  /** Восстанавливает локально подготовленный коммит после перезагрузки страницы. */
  async #restorePendingCommit(mapId: number, revision: number) {
    if (this.#mode.isReadOnly()) return;

    const accountId = this.#account.user()?.id;
    if (accountId === undefined) return;

    const commit = await this.#commits.pending(accountId, mapId);
    if (!commit) return;

    if (
      commit.version !== 1 ||
      commit.mapId !== mapId ||
      commit.accountId !== accountId ||
      (revision !== commit.expectedRevision &&
        revision !== commit.expectedRevision + 1)
    ) {
      this.error.set(
        'Незавершённое сохранение относится к другой версии карты. Оно осталось в браузере.',
      );
      return;
    }

    this.#recoveryBaseRevision = commit.expectedRevision;
    this.#preparedCommit = commit;

    if (revision === 0) this.#storage.sceneBounds = commit.header.bounds;
    if (this.#storage.nodesRoot().id !== commit.header.rootId)
      this.#storage.importSceneRoot(commit.header.rootId);
    this.#storage.importSceneContainers(
      commit.containers
        .filter((item) => !item.deleted)
        .map((item) => ({ ...item, parentId: item.parentId ?? null })),
      true,
    );

    for (const id of commit.removedIds) this.#storage.deletedShapeIds.add(id);
    await this.#storage.importChunk(
      JSON.stringify(
        commit.records.filter(
          (record) => !this.#storage.deletedShapeIds.has(record.shape.id),
        ),
      ),
      () => true,
      true,
    );

    for (const page of commit.pages) this.#dirtyPages.add(pageKey(page));
    this.error.set(
      'В браузере есть незавершённое сохранение. Нажмите «Сохранить», чтобы продолжить его.',
    );
  }

  /** Восстанавливает локальные изменения карты поверх загруженной ревизии. */
  async #restoreDraft(mapId: number, revision: number) {
    if (this.#mode.isReadOnly()) return;

    const accountId = this.#account.user()?.id;
    if (accountId === undefined) return;

    try {
      const draft = await this.#draftStore.read(accountId, mapId);
      if (!draft || draft.version !== 1) return;

      if (
        draft.baseRevision !== revision &&
        draft.baseRevision !== this.#recoveryBaseRevision
      ) {
        this.error.set(
          'Локальный черновик относится к другой версии карты. Он сохранён в браузере.',
        );
        this.#draftRecoveryError = true;
        return;
      }

      if (
        draft.sourceMapId &&
        draft.sourceHeader &&
        !this.#preparedCommit &&
        revision === 0 &&
        isMapSceneHeaderV4(draft.sourceHeader)
      ) {
        this.#storage.importSceneRoot(draft.sourceHeader.rootId);
        this.#baselineContainers.clear();
        this.#knownContainers.clear();
        this.#mapId = draft.sourceMapId;
        this.#header = draft.sourceHeader;
        this.revision = draft.sourceRevision ?? 0;
        this.sceneMapId.set(draft.sourceMapId);
        this.sceneRevision.set(this.revision);
        this.#storage.sceneBounds = draft.sourceHeader.bounds;
        this.#draftTargetMapId = mapId;
        await this.#ensureParents([draft.sourceHeader.rootId], true);
        await this.#loadBootstrapTiles(draft.sourceHeader.bootstrap);
      } else if (
        draft.rootId &&
        this.#storage.nodesRoot().id !== draft.rootId &&
        !this.#preparedCommit
      ) {
        this.#storage.importSceneRoot(draft.rootId);
        this.#knownContainers.clear();
        this.#baselineContainers.clear();
      }

      this.#storage.importSceneContainers(
        draft.containers
          .filter((item) => !item.deleted)
          .map((item) => ({ ...item, parentId: item.parentId ?? null })),
        true,
      );
      for (const item of draft.containers) this.#knownContainers.add(item.id);
      for (const record of draft.records)
        this.#storage.deletedShapeIds.delete(record.shape.id);

      for (const id of draft.removedIds) this.#storage.deletedShapeIds.add(id);
      this.#storage.releaseChunk(new Set(draft.removedIds));
      await this.#storage.importChunk(
        JSON.stringify(
          draft.records.filter(
            (record) => !this.#storage.deletedShapeIds.has(record.shape.id),
          ),
        ),
        () => true,
        true,
      );

      for (const key of draft.changedPages) this.#dirtyPages.add(key);
      if (revision === 0 && !draft.sourceMapId && this.#storage.shapes.size)
        this.#storage.sceneBounds = this.#contentBounds();
    } catch {
      this.error.set(
        'Не удалось восстановить локальный черновик. Серверная карта не изменена.',
      );
      this.#draftRecoveryError = true;
    }
  }

  /** Планирует отложенную запись текущего черновика в локальное хранилище. */
  #saveDraft() {
    if (
      this.#saving ||
      (this.#draftTargetMapId ?? this.#mapId) === null ||
      this.#mode.isReadOnly()
    )
      return;
    const accountId = this.#account.user()?.id;
    if (accountId === undefined) return;
    if (this.#draftTimer) clearTimeout(this.#draftTimer);
    const epoch = this.#epoch;
    this.#draftTimer = setTimeout(() => {
      if (epoch !== this.#epoch) return;
      void this.#writeDraft().catch(() =>
        this.error.set('Не удалось сохранить локальный черновик в браузере.'),
      );
    }, 250);
  }

  /** Записывает локальный черновик и сохраняет информацию для его восстановления. */
  async #writeDraft() {
    const mapId = this.#draftTargetMapId ?? this.#mapId;
    const sourceMapId = mapId !== this.#mapId ? this.#mapId : null;
    const revision =
      sourceMapId !== null || this.#header === null
        ? 0
        : (this.#preparedCommit?.expectedRevision ?? this.revision);
    const accountId = this.#account.user()?.id;
    if (mapId === null || accountId === undefined || this.#mode.isReadOnly())
      return;

    const current = this.#records();
    const currentIds = new Set(current.map((record) => record.shape.id));
    const stagedRecords = new Map(
      this.#preparedCommit?.records.map((record) => [
        record.shape.id,
        record,
      ]) ?? [],
    );

    const stagedRemoved = new Set(this.#preparedCommit?.removedIds ?? []);
    const records = current.filter((record) => {
      const before = stagedRemoved.has(record.shape.id)
        ? undefined
        : (stagedRecords.get(record.shape.id) ??
          this.#baselineRecords.get(record.shape.id));
      const normalized = {
        ...record,
        shape: { ...record.shape, selected: false },
        node: { ...record.node, isDirty: false },
      };
      const baseline = before && {
        ...before,
        shape: { ...before.shape, selected: false },
        node: { ...before.node, isDirty: false },
      };
      return (
        !baseline || JSON.stringify(normalized) !== JSON.stringify(baseline)
      );
    });

    const removedIds = [
      ...new Set([
        ...this.#storage.deletedShapeIds,
        ...[...this.#baselineRecords.keys(), ...stagedRecords.keys()].filter(
          (id) => !currentIds.has(id),
        ),
      ]),
    ];

    const changedPages = new Set(this.#dirtyPages);
    for (const [key, ids] of this.#pageIds)
      if (
        [...ids].some(
          (id) =>
            removedIds.includes(id) ||
            records.some((record) => record.shape.id === id),
        )
      )
        changedPages.add(key);
    for (const record of records) {
      const shape = this.#storage.shapes.get(record.shape.id);
      if (!shape) continue;
      const bounds = shape.getBounds();
      changedPages.add(`${mapCellOf(bounds.x)}:${mapCellOf(bounds.y)}:0`);
    }

    const containers = this.#containerChanges();
    const changedContainers = containers.some(
      (item) =>
        JSON.stringify(item) !==
        JSON.stringify(this.#baselineContainers.get(item.id)),
    );
    if (
      !records.length &&
      !removedIds.length &&
      !changedPages.size &&
      !changedContainers &&
      sourceMapId === null
    ) {
      await this.#draftStore.remove(accountId, mapId);
      return;
    }

    await this.#draftStore.write({
      version: 1,
      accountId,
      mapId,
      baseRevision: revision,
      rootId: this.#storage.nodesRoot().id,
      ...(sourceMapId !== null && this.#header
        ? {
            sourceMapId,
            sourceRevision: this.revision,
            sourceHeader: this.#header,
          }
        : {}),
      changedPages: [...changedPages],
      removedIds,
      records,
      containers,
    });
  }
}
