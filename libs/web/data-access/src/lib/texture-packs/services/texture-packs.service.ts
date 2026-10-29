import { TextureKind } from '@wm/shared/workshop';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../../shared';
import {
  CreateTexturePack,
  PublishedTexturePack,
  PublishedTexturePackPage,
  PublishedTexturePackDetails,
  TextureItem,
  TexturePackDetails,
  TexturePage,
  TexturePack,
  UpdateTexturePack,
  TexturePackLikeState,
} from '../interfaces';
import {
  toPublishedTexturePackPageView,
  toPublishedTexturePackView,
  toTexturePackView,
  toTexturePageView,
} from '../utils/texture-pack.mapper';

/** HTTP-доступ к наборам и текстурам; составную загрузку координирует фасад. */
@Injectable({
  providedIn: 'root',
})
export class TexturePacksService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  /** Возвращает собственные наборы с URL превью. */
  listMine() {
    return this.#http
      .get<TexturePack[]>(`${this.#apiConfig.baseUrl}texture-packs/mine`)
      .pipe(
        map((packs) =>
          packs.map((pack) => toTexturePackView(pack, this.#apiConfig.baseUrl)),
        ),
      );
  }

  /** Загружает страницу опубликованных наборов. */
  listPublicCatalog(page: number, pageSize: number) {
    return this.#http
      .get<PublishedTexturePackPage>(
        `${this.#apiConfig.baseUrl}texture-packs`,
        { params: { page, pageSize } },
      )
      .pipe(
        map((result) =>
          toPublishedTexturePackPageView(result, this.#apiConfig.baseUrl),
        ),
      );
  }

  /** Возвращает опубликованные наборы выбранного автора. */
  listPublicByAuthor(authorUserId: number) {
    return this.#listPublic(`texture-packs/authors/${authorUserId}`);
  }

  #listPublic(path: string) {
    return this.#http
      .get<PublishedTexturePack[]>(`${this.#apiConfig.baseUrl}${path}`)
      .pipe(
        map((packs) =>
          packs.map((pack) =>
            toPublishedTexturePackView(pack, this.#apiConfig.baseUrl),
          ),
        ),
      );
  }

  /** Загружает метаданные опубликованного набора. */
  getPublicPack(packId: string) {
    return this.#http.get<PublishedTexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
    );
  }

  /** Загружает страницу публичной галереи с необязательным фильтром вида. */
  listPublicTextures(
    packId: string,
    page: number,
    pageSize = 48,
    kind?: TextureKind,
  ) {
    return this.#http
      .get<TexturePage>(
        `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures`,
        { params: { page, pageSize, ...(kind ? { kind } : {}) } },
      )
      .pipe(
        map((result) => toTexturePageView(result, this.#apiConfig.baseUrl)),
      );
  }

  /** Создаёт набор из переданных метаданных. */
  create(request: CreateTexturePack) {
    return this.#http.post<Omit<TexturePack, 'textures' | '_count'>>(
      `${this.#apiConfig.baseUrl}texture-packs`,
      request,
    );
  }

  /** Загружает набор через API владельца для редактирования. */
  getOwned(packId: string) {
    return this.#http.get<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/mine/${packId}`,
    );
  }

  /** Сохраняет название и описание набора. */
  update(packId: string, request: UpdateTexturePack) {
    return this.#http.patch<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
      request,
    );
  }

  /** Загружает страницу галереи владельца, включая неопубликованные текстуры. */
  listOwnedTextures(
    packId: string,
    page: number,
    pageSize = 48,
    kind?: TextureKind,
  ) {
    return this.#http
      .get<TexturePage>(
        `${this.#apiConfig.baseUrl}texture-packs/mine/${packId}/textures`,
        { params: { page, pageSize, ...(kind ? { kind } : {}) } },
      )
      .pipe(
        map((result) => toTexturePageView(result, this.#apiConfig.baseUrl)),
      );
  }

  /** Передаёт файлы и вид текстур в multipart-запросе. */
  upload(packId: string, files: File[], kind: TextureKind = 'SURFACE') {
    const body = new FormData();
    body.append('kind', kind);

    for (const file of files) body.append('files', file);

    return this.#http.post<TextureItem[]>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures`,
      body,
    );
  }

  /** Изменяет вид текстуры внутри набора. */
  updateTextureKind(packId: string, textureId: string, kind: TextureKind) {
    return this.#http.patch<{ id: string; kind: TextureKind }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures/${textureId}`,
      { kind },
    );
  }

  /** Удаляет текстуру через API владельца. */
  removeOwnedTexture(packId: string, textureId: string) {
    return this.#http.delete<{ id: string }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures/${textureId}`,
    );
  }

  /** Удаляет набор через API владельца. */
  removeOwned(packId: string) {
    return this.#http.delete<{ id: string }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
    );
  }

  /** Изменяет состояние публикации набора. */
  updatePublication(packId: string, isPublished: boolean) {
    return this.#http.patch<{
      id: string;
      isPublished: boolean;
      publishedAt: string | null;
    }>(`${this.#apiConfig.baseUrl}texture-packs/${packId}/publication`, {
      isPublished,
    });
  }

  /** Добавляет отметку текущего пользователя и возвращает актуальный счётчик. */
  like(packId: string) {
    return this.#http.post<TexturePackLikeState>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/like`,
      {},
    );
  }

  /** Убирает отметку текущего пользователя и возвращает актуальный счётчик. */
  unlike(packId: string) {
    return this.#http.delete<TexturePackLikeState>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/like`,
    );
  }
}
