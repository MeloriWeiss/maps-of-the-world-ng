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

  mapId = signal<number | null>(this.#readMapId());
  mapName = signal('Generated world');
  status = signal('');
  busy = signal(false);

  async save() {
    this.busy.set(true);
    this.status.set('Сохранение…');
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
      this.status.set(`Карта «${map.name}» сохранена`);
    } catch {
      this.status.set('Не удалось сохранить карту');
    } finally {
      this.busy.set(false);
    }
  }

  async load() {
    this.busy.set(true);
    this.status.set('Загрузка…');
    try {
      let id = this.mapId();
      if (!id) {
        const maps = await firstValueFrom(
          this.#http.get<MapSummary[]>('/api/maps'),
        );
        id = maps[0]?.id ?? null;
      }
      if (!id) {
        this.status.set('Сохранённых карт пока нет');
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
          this.status.set('Сохранённых карт пока нет');
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
      this.status.set(`Карта «${map.name}» загружена`);
    } catch {
      this.status.set('Не удалось загрузить карту');
    } finally {
      this.busy.set(false);
    }
  }

  newMap() {
    this.#forgetMapId();
    this.status.set('Следующее сохранение создаст новую карту');
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
