import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from '../../shared';
import {
  MapSummary,
  PublishedMapPage,
  PublishedStoredMap,
  SaveMap,
  StoredMap,
  LikeState,
} from '../interfaces/map';

/** Выполняет запросы и операции API карт. */
@Injectable({
  providedIn: 'root',
})
export class MapsService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  /** Загружает краткие сведения о картах текущего пользователя. */
  listMine() {
    return this.#http.get<MapSummary[]>(`${this.#apiConfig.baseUrl}maps/mine`);
  }

  /** Загружает опубликованные карты выбранного автора. */
  listPublicByAuthor(authorUserId: number) {
    return this.#http.get<MapSummary[]>(
      `${this.#apiConfig.baseUrl}maps/authors/${authorUserId}`,
    );
  }

  /** Загружает страницу публичного каталога карт. */
  listCatalog(page: number, pageSize: number) {
    return this.#http.get<PublishedMapPage>(`${this.#apiConfig.baseUrl}maps`, {
      params: { page, pageSize },
    });
  }

  /** Загружает опубликованную карту и её содержимое. */
  getPublicMap(mapId: number, context?: HttpContext) {
    return this.#http.get<PublishedStoredMap>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
      { context },
    );
  }

  /** Загружает карту владельца, включая неопубликованный черновик. */
  getOwned(mapId: number, context?: HttpContext) {
    return this.#http.get<StoredMap>(
      `${this.#apiConfig.baseUrl}maps/mine/${mapId}`,
      { context },
    );
  }

  /** Создаёт карту из переданных метаданных и содержимого. */
  create(map: SaveMap) {
    return this.#http.post<MapSummary>(`${this.#apiConfig.baseUrl}maps`, map);
  }

  /** Сохраняет изменения карты владельца. */
  update(mapId: number, map: SaveMap, context?: HttpContext) {
    return this.#http.put<MapSummary>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
      map,
      { context },
    );
  }

  /** Изменяет состояние публикации карты. */
  updatePublication(mapId: number, isPublished: boolean) {
    return this.#http.patch<{ id: number; isPublished: boolean }>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/publication`,
      { isPublished },
    );
  }

  /** Удаляет карту через API владельца. */
  removeOwned(mapId: number) {
    return this.#http.delete<{ id: number }>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
    );
  }

  /** Ставит отметку текущего пользователя карте. */
  like(mapId: number) {
    return this.#http.post<LikeState>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/like`,
      {},
    );
  }

  /** Убирает отметку текущего пользователя с карты. */
  unlike(mapId: number) {
    return this.#http.delete<LikeState>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/like`,
    );
  }
}
