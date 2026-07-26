import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WorkshopCanvasManagerService } from './workshop-canvas-manager.service';
import { WorkshopSceneGraphStorageService } from './workshop-scene-graph-storage.service';

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
  #canvasManager = inject(WorkshopCanvasManagerService);
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
      const map = id
        ? await firstValueFrom(
            this.#http.put<MapSummary>(`/api/maps/${id}`, payload),
          )
        : await firstValueFrom(
            this.#http.post<MapSummary>('/api/maps', payload),
          );
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

      const map = await firstValueFrom(
        this.#http.get<StoredMap>(`/api/maps/${id}`),
      );
      this.#storage.importSnapshot(map.body);
      this.mapId.set(map.id);
      this.mapName.set(map.name);
      localStorage.setItem(this.#mapIdKey, String(map.id));
      this.#canvasManager.requestRedraw();
      this.status.set(`Карта «${map.name}» загружена`);
    } catch {
      this.status.set('Не удалось загрузить карту');
    } finally {
      this.busy.set(false);
    }
  }

  newMap() {
    this.mapId.set(null);
    localStorage.removeItem(this.#mapIdKey);
    this.status.set('Следующее сохранение создаст новую карту');
  }

  #readMapId() {
    const id = Number(localStorage.getItem(this.#mapIdKey));
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
