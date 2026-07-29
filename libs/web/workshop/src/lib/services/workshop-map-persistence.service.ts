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

@Injectable()
export class WorkshopMapPersistenceService {
  #mapsService = inject(MapsService);
  #storage = inject(WorkshopSceneGraphStorageService);
  #panning = inject(WorkshopPanningService);
  #canvasManager = inject(WorkshopCanvasManagerService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #mapIdKey = 'workshop-map-id';
  #statusMessage = createTransientMessage();

  readonly maps = signal<MapSummary[]>([]);
  readonly mapId = signal<number | null>(this.#readMapId());
  readonly mapName = signal('Новая карта');
  readonly status = this.#statusMessage.value;
  readonly busy = signal(false);

  async initializeFromRoute() {
    await this.refreshMaps();

    if (this.#route.snapshot.queryParamMap.get('new') === 'true') {
      this.newMap();
      return;
    }

    const routeMapId = Number(this.#route.snapshot.queryParamMap.get('mapId'));
    if (Number.isInteger(routeMapId) && routeMapId > 0) {
      await this.load(routeMapId);
    }
  }

  async refreshMaps() {
    try {
      this.maps.set(await firstValueFrom(this.#mapsService.listMine()));
    } catch {
      this.maps.set([]);
    }
  }

  async save() {
    this.busy.set(true);
    this.#statusMessage.show('Сохранение…', 0);
    const payload: SaveMap = {
      name: this.mapName().trim() || 'Новая карта',
      description: 'Карта из мастерской',
      body: this.#storage.exportSnapshot(),
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
      await this.refreshMaps();
      await this.#setRoute(map.id);
      this.#statusMessage.show(`Карта «${map.name}» сохранена`);
    } catch {
      this.#statusMessage.show('Не удалось сохранить карту');
    } finally {
      this.busy.set(false);
    }
  }

  async load(mapId = this.mapId()) {
    if (!mapId) {
      this.#statusMessage.show('Выберите карту для загрузки');
      return;
    }

    this.busy.set(true);
    this.#statusMessage.show('Загрузка…', 0);
    try {
      const map = await firstValueFrom(
        this.#mapsService.get(mapId, this.#silentErrors()),
      );
      this.#storage.importSnapshot(map.body);
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

  async selectMap(mapId: number | null) {
    if (mapId === null) {
      this.newMap();
      return;
    }
    await this.load(mapId);
  }

  newMap() {
    this.#forgetMapId();
    this.mapName.set('Новая карта');
    this.#storage.clearStorage();
    this.#panning.fitContent();
    this.#canvasManager.redraw();
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { new: true, mapId: null },
      replaceUrl: true,
    });
    this.#statusMessage.show(
      'Создан новый черновик. Сохраните его, чтобы добавить в профиль',
    );
  }

  #rememberMap(map: MapSummary) {
    this.mapId.set(map.id);
    this.mapName.set(map.name);
    localStorage.setItem(this.#mapIdKey, String(map.id));
  }

  #readMapId() {
    const id = Number(localStorage.getItem(this.#mapIdKey));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  #forgetMapId() {
    this.mapId.set(null);
    localStorage.removeItem(this.#mapIdKey);
  }

  #silentErrors() {
    return new HttpContext().set(BYPASS_GLOBAL_ERROR, true);
  }

  #setRoute(mapId: number) {
    return this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { mapId, new: null },
      replaceUrl: true,
    });
  }
}
