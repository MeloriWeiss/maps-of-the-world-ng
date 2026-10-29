import { WorkshopChunksService } from './workshop-chunks.service';
import { WorkshopShapesService } from './workshop-shapes.service';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { createTransientMessage } from '@wm/web/common-ui';
import { MapsService, MapSummary, SaveMap } from '@wm/web/data-access/maps';
import { BYPASS_GLOBAL_ERROR } from '@wm/web/data-access/shared';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import { WorkshopPanningService } from './workshop-panning.service';
import { WorkshopCanvasSizeService } from './workshop-canvas-size.service';
import { WorkshopModeService } from './workshop-mode.service';
import { AuthService } from '@wm/web/data-access/auth';
import { toSignal } from '@angular/core/rxjs-interop';

/** Формирует ограниченное по длине сообщение для ошибки сохранения карты. */
function saveFailure(error: unknown) {
  const response =
    error instanceof HttpErrorResponse
      ? (error.error as { message?: unknown } | null)
      : null;
  const details =
    response && typeof response.message === 'string'
      ? response.message
      : error instanceof Error
        ? error.message
        : '';
  return details
    ? `Не удалось сохранить карту: ${details.slice(0, 180)}`
    : 'Не удалось сохранить карту';
}

/** Загружает и сохраняет карту через API Workshop. */
@Injectable()
export class WorkshopMapPersistenceService {
  #chunks = inject(WorkshopChunksService);
  #shapes = inject(WorkshopShapesService);
  #mapsService = inject(MapsService);
  #storage = inject(WorkshopSceneGraphStorageService);
  #panning = inject(WorkshopPanningService);
  #canvasManager = inject(WorkshopCanvasManagerService);
  #canvasSize = inject(WorkshopCanvasSizeService);
  #mode = inject(WorkshopModeService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #authService = inject(AuthService);
  #mapIdKey = 'workshop-map-id';
  #statusMessage = createTransientMessage();

  readonly maps = signal<MapSummary[]>([]);
  readonly mapId = signal<number | null>(this.#readMapId());
  readonly mapName = signal('Новая карта');
  readonly mapDescription = signal('');
  readonly isReadOnly = this.#mode.isReadOnly;
  readonly canSaveCopy = signal(false);
  readonly status = this.#statusMessage.value;
  readonly busy = signal(false);
  readonly saving = signal(false);
  readonly publishedMapId = signal<number | null>(null);
  readonly publishedMapLikesCount = signal(0);
  readonly isPublishedMapLiked = signal(false);
  readonly isUpdatingLike = signal(false);
  readonly isAuthorized = toSignal(this.#authService.isAuthorized$, {
    initialValue: this.#authService.isAuthorized$.value,
  });

  /** Восстанавливает выбранную карту и режим редактора из параметров маршрута. */
  async initializeFromRoute() {
    const mapsLoaded = await this.refreshMaps();

    const publicMapId = Number(
      this.#route.snapshot.queryParamMap.get('viewMapId'),
    );
    if (Number.isInteger(publicMapId) && publicMapId > 0) {
      await this.loadPublished(publicMapId);
      return;
    }

    if (this.#route.snapshot.queryParamMap.get('new') === 'true') {
      this.newMap();
      return;
    }

    const routeMapId = Number(this.#route.snapshot.queryParamMap.get('mapId'));
    if (Number.isInteger(routeMapId) && routeMapId > 0) {
      if (mapsLoaded && !this.maps().some((map) => map.id === routeMapId)) {
        this.newMap();
        return;
      }
      await this.load(routeMapId);
      return;
    }
    const rememberedMapId = this.mapId();
    if (rememberedMapId !== null) {
      if (
        mapsLoaded &&
        !this.maps().some((map) => map.id === rememberedMapId)
      ) {
        this.newMap();
        return;
      }
      await this.load(rememberedMapId);
      if (this.mapId() !== null) return;
    }
    this.#chunks.beginLocalDraft();
  }

  /** Загружает список карт пользователя для выбора в редакторе. */
  async refreshMaps() {
    try {
      this.maps.set(await firstValueFrom(this.#mapsService.listMine()));
      return true;
    } catch {
      this.maps.set([]);
      return false;
    }
  }

  /** Сохраняет текущую карту и её сцену в личные карты пользователя. */
  async save() {
    if (this.isReadOnly() || this.busy()) return;

    this.#shapes.endOperation();

    this.busy.set(true);
    this.saving.set(true);
    this.#statusMessage.show('Сохранение…', 0);

    const payload: SaveMap = {
      name: this.mapName().trim() || 'Новая карта',
      description: this.mapDescription().trim() || undefined,
    };

    try {
      const id = this.mapId();
      let map: MapSummary;

      if (id) {
        try {
          map = await firstValueFrom(
            this.#mapsService.update(id, payload, this.#silentErrors()),
          );
        } catch (error) {
          if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
            throw error;
          }
          map = await firstValueFrom(this.#mapsService.create(payload));
        }
      } else {
        map = await firstValueFrom(this.#mapsService.create(payload));
      }

      this.#rememberMap(map);
      await this.#setRoute(map.id);
      await this.#chunks.save(map.id, !this.#chunks.hasSceneFor(map.id));
      this.#statusMessage.show(`Карта «${map.name}» сохранена`);
    } catch (error) {
      this.#statusMessage.show(saveFailure(error));
    } finally {
      this.saving.set(false);
      this.busy.set(false);
    }
  }

  /** Создаёт личную копию открытой публичной карты и переключает редактор на неё. */
  async saveCopy() {
    if (!this.isReadOnly() || !this.canSaveCopy() || this.busy()) return;

    this.#shapes.endOperation();

    this.busy.set(true);
    this.saving.set(true);
    this.#statusMessage.show('Сохраняем копию…', 0);

    const copyName = `${this.mapName()} — копия`.slice(0, 120);
    const payload: SaveMap = {
      name: copyName,
      description: 'Копия карты из публичной библиотеки',
    };

    try {
      const map = await firstValueFrom(this.#mapsService.create(payload));
      this.isReadOnly.set(false);
      this.#resetPublishedMapState();
      this.#rememberMap(map);
      await this.#setRoute(map.id);
      await this.#chunks.save(map.id, true);
      await this.#resizeAndFitContent();
      this.#statusMessage.show(
        `Карта «${map.name}» сохранена в ваши черновики`,
      );
    } catch (error) {
      this.#statusMessage.show(saveFailure(error));
    } finally {
      this.saving.set(false);
      this.busy.set(false);
    }
  }

  /** Загружает публичную карту в режиме просмотра. */
  async loadPublished(mapId: number) {
    this.busy.set(true);
    this.isReadOnly.set(true);
    this.canSaveCopy.set(false);
    this.#resetPublishedMapState();
    this.#statusMessage.show('Загрузка карты…', 0);
    try {
      const map = await firstValueFrom(
        this.#mapsService.getPublicMap(mapId, this.#silentErrors()),
      );

      await this.#chunks.open(map.id, map.body, map.revision ?? 0);
      this.#shapes.resetHistory();

      this.mapId.set(null);
      this.publishedMapId.set(map.id);
      this.mapName.set(map.name);
      this.mapDescription.set(map.description ?? '');
      this.publishedMapLikesCount.set(map.likesCount);
      this.isPublishedMapLiked.set(map.isLiked);
      this.canSaveCopy.set(true);

      await this.#resizeAndFitContent();
      this.#statusMessage.show(`Карта «${map.name}» открыта для просмотра`);
    } catch {
      this.#statusMessage.show('Не удалось открыть публичную карту');
    } finally {
      this.busy.set(false);
    }
  }

  /** Загружает личную карту и восстанавливает редактируемую сцену. */
  async load(mapId = this.mapId()) {
    if (!mapId) {
      this.#statusMessage.show('Выберите карту для загрузки');
      return;
    }

    this.busy.set(true);
    this.#statusMessage.show('Загрузка…', 0);
    try {
      const map = await firstValueFrom(
        this.#mapsService.getOwned(mapId, this.#silentErrors()),
      );

      await this.#chunks.open(map.id, map.body, map.revision ?? 0);
      this.#shapes.resetHistory();
      this.#resetPublishedMapState();

      this.#rememberMap(map);
      this.#panning.fitContent();
      this.#canvasManager.redraw();
      await this.#setRoute(map.id);
      this.#statusMessage.show(`Карта «${map.name}» загружена`);
    } catch {
      this.#forgetMapId();
      this.#statusMessage.show('Не удалось загрузить карту');
    } finally {
      this.busy.set(false);
    }
  }

  /** Переключает редактор на выбранную карту или создаёт новый черновик. */
  async selectMap(mapId: number | null) {
    if (mapId === null) {
      this.newMap();
      return;
    }
    await this.load(mapId);
  }

  /** Сбрасывает текущую сцену и начинает новый локальный черновик. */
  newMap() {
    this.#chunks.reset();
    this.#shapes.resetHistory();
    this.isReadOnly.set(false);
    this.canSaveCopy.set(false);
    this.#forgetMapId();
    this.mapName.set('Новая карта');
    this.mapDescription.set('');
    this.#resetPublishedMapState();
    this.#storage.clearStorage();
    this.#chunks.beginLocalDraft();
    this.#panning.fitContent();
    this.#canvasManager.redraw();
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { new: true, mapId: null, viewMapId: null },
      replaceUrl: true,
    });
    this.#statusMessage.show(
      'Создан новый черновик. Сохраните его, чтобы добавить в профиль',
    );
  }

  /** Переключает отметку «нравится» для открытой публичной карты. */
  async togglePublishedMapLike() {
    const mapId = this.publishedMapId();
    if (!mapId || !this.isAuthorized() || this.isUpdatingLike()) return;

    this.isUpdatingLike.set(true);
    try {
      const request = this.isPublishedMapLiked()
        ? this.#mapsService.unlike(mapId)
        : this.#mapsService.like(mapId);
      const result = await firstValueFrom(request);
      this.isPublishedMapLiked.set(result.isLiked);
      this.publishedMapLikesCount.set(result.likesCount);
    } catch {
      this.#statusMessage.show('Не удалось изменить отметку карты');
    } finally {
      this.isUpdatingLike.set(false);
    }
  }

  /** Обновляет выбранную карту и сохраняет её идентификатор между сеансами. */
  #rememberMap(map: MapSummary) {
    this.maps.update((items) => [
      map,
      ...items.filter((item) => item.id !== map.id),
    ]);
    this.mapId.set(map.id);
    this.mapName.set(map.name);
    this.mapDescription.set(map.description ?? '');
    localStorage.setItem(this.#mapIdKey, String(map.id));
  }

  /** Читает из браузерного хранилища последний выбранный идентификатор карты. */
  #readMapId() {
    const id = Number(localStorage.getItem(this.#mapIdKey));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** Сбрасывает выбранную карту и удаляет её идентификатор из браузера. */
  #forgetMapId() {
    this.mapId.set(null);
    localStorage.removeItem(this.#mapIdKey);
  }

  /** Очищает локальное состояние открытой публичной карты. */
  #resetPublishedMapState() {
    this.publishedMapId.set(null);
    this.publishedMapLikesCount.set(0);
    this.isPublishedMapLiked.set(false);
  }

  /** Создаёт контекст запроса, который обрабатывает ошибку локально. */
  #silentErrors() {
    return new HttpContext().set(BYPASS_GLOBAL_ERROR, true);
  }

  /** Обновляет query-параметр маршрута для выбранной личной карты. */
  #setRoute(mapId: number) {
    return this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { mapId, new: null, viewMapId: null },
      replaceUrl: true,
    });
  }

  /** Пересчитывает размеры холста и вписывает загруженную сцену после кадра. */
  #resizeAndFitContent() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        this.#canvasSize.resizeCanvas(false);
        this.#panning.fitContent();
        this.#canvasManager.redraw();
        resolve();
      });
    });
  }
}
