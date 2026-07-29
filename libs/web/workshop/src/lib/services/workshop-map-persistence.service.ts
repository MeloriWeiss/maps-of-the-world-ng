import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BYPASS_GLOBAL_ERROR } from '@wm/web/data-access/shared';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';
import { WorkshopPanningService } from './workshop-panning.service';
import { createTransientMessage } from '@wm/web/common-ui';

interface MapSummary {
  id: number;
  name: string;
  description?: string;
}

interface StoredMap extends MapSummary {
  body: string;
}

@Injectable()
export class WorkshopMapPersistenceService {
  #http = inject(HttpClient);
  #storage = inject(WorkshopSceneGraphStorageService);
  #panning = inject(WorkshopPanningService);
  #mapIdKey = 'workshop-map-id';
  #statusMessage = createTransientMessage();

  mapId = signal<number | null>(this.#readMapId());
  mapName = signal('Generated world');
  status = this.#statusMessage.value;
  busy = signal(false);

  async save() {
    this.busy.set(true);
    this.#statusMessage.show('Сохранение…', 0);
    const payload = {
      name: this.mapName(),
      description: 'Workshop prototype map',
      body: this.#storage.exportSnapshot(),
    };

    try {
      const id = this.mapId();
      let map: MapSummary;

      if (id) {
        try {
          map = await firstValueFrom(
            this.#http.put<MapSummary>(`/api/maps/${id}`, payload, {
              context: this.#silentErrors(),
            }),
          );
        } catch (error) {
          if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
            throw error;
          }

          this.#forgetMapId();
          map = await firstValueFrom(
            this.#http.post<MapSummary>('/api/maps', payload),
          );
        }
      } else {
        map = await firstValueFrom(
          this.#http.post<MapSummary>('/api/maps', payload),
        );
      }

      this.mapId.set(map.id);
      localStorage.setItem(this.#mapIdKey, String(map.id));
      this.#statusMessage.show(`Карта «${map.name}» сохранена`);
    } catch {
      this.#statusMessage.show('Не удалось сохранить карту');
    } finally {
      this.busy.set(false);
    }
  }

  async load() {
    this.busy.set(true);
    this.#statusMessage.show('Загрузка…', 0);
    try {
      let id = this.mapId();
      if (!id) {
        const maps = await firstValueFrom(
          this.#http.get<MapSummary[]>('/api/maps'),
        );
        id = maps[0]?.id ?? null;
      }
      if (!id) {
        this.#statusMessage.show('Сохранённых карт пока нет');
        return;
      }

      let map: StoredMap;
      try {
        map = await firstValueFrom(
          this.#http.get<StoredMap>(`/api/maps/${id}`, {
            context: this.#silentErrors(),
          }),
        );
      } catch (error) {
        if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
          throw error;
        }

        this.#forgetMapId();
        const maps = await firstValueFrom(
          this.#http.get<MapSummary[]>('/api/maps'),
        );
        const fallbackId = maps[0]?.id;
        if (!fallbackId) {
          this.#statusMessage.show('Сохранённых карт пока нет');
          return;
        }
        map = await firstValueFrom(
          this.#http.get<StoredMap>(`/api/maps/${fallbackId}`),
        );
      }
      this.#storage.importSnapshot(map.body);
      this.mapId.set(map.id);
      this.mapName.set(map.name);
      localStorage.setItem(this.#mapIdKey, String(map.id));
      this.#panning.fitContent();
      this.#statusMessage.show(`Карта «${map.name}» загружена`);
    } catch {
      this.#statusMessage.show('Не удалось загрузить карту');
    } finally {
      this.busy.set(false);
    }
  }

  newMap() {
    this.#forgetMapId();
    this.#statusMessage.show('Следующее сохранение создаст новую карту');
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
}
