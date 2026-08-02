import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from '../shared';
import {
  MapSummary,
  PublishedMapSummary,
  PublishedStoredMap,
  SaveMap,
  StoredMap,
  LikeState,
} from './interfaces';

@Injectable({
  providedIn: 'root',
})
export class MapsService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  listMine() {
    return this.#http.get<MapSummary[]>(`${this.#apiConfig.baseUrl}maps/mine`);
  }

  listPublicByAuthor(authorUserId: number) {
    return this.#http.get<MapSummary[]>(`${this.#apiConfig.baseUrl}maps`, {
      params: { authorId: authorUserId },
    });
  }

  listCatalog() {
    return this.#http.get<PublishedMapSummary[]>(
      `${this.#apiConfig.baseUrl}maps`,
    );
  }

  getPublicMap(mapId: number, context?: HttpContext) {
    return this.#http.get<PublishedStoredMap>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
      { context },
    );
  }

  getOwned(mapId: number, context?: HttpContext) {
    return this.#http.get<StoredMap>(
      `${this.#apiConfig.baseUrl}maps/mine/${mapId}`,
      { context },
    );
  }

  create(map: SaveMap) {
    return this.#http.post<MapSummary>(`${this.#apiConfig.baseUrl}maps`, map);
  }

  update(mapId: number, map: SaveMap, context?: HttpContext) {
    return this.#http.put<MapSummary>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
      map,
      { context },
    );
  }

  updatePublication(mapId: number, isPublished: boolean) {
    return this.#http.patch<{ id: number; isPublished: boolean }>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/publication`,
      { isPublished },
    );
  }

  removeOwned(mapId: number) {
    return this.#http.delete<{ id: number }>(
      `${this.#apiConfig.baseUrl}maps/${mapId}`,
    );
  }

  like(mapId: number) {
    return this.#http.post<LikeState>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/like`,
      {},
    );
  }

  unlike(mapId: number) {
    return this.#http.delete<LikeState>(
      `${this.#apiConfig.baseUrl}maps/${mapId}/like`,
    );
  }
}
