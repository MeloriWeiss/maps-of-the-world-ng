import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../shared';
import {
  CreateTexturePack,
  PublishedTexturePack,
  PublishedTexturePackDetails,
  PublishedTexturePackView,
  TextureItem,
  TextureItemView,
  TexturePackDetails,
  TexturePage,
  TexturePageView,
  TexturePack,
  TexturePackView,
  UpdateTexturePack,
} from './interfaces';

@Injectable({
  providedIn: 'root',
})
export class TexturePacksService {
  #http = inject(HttpClient);
  #apiConfig = inject(API_CONFIG);

  listMine() {
    return this.#http
      .get<TexturePack[]>(`${this.#apiConfig.baseUrl}texture-packs/mine`)
      .pipe(map((packs) => packs.map((pack) => this.#toView(pack))));
  }

  listPublished(authorUserId?: number) {
    const path =
      authorUserId === undefined
        ? 'texture-packs'
        : `texture-packs/authors/${authorUserId}`;
    return this.#http
      .get<PublishedTexturePack[]>(`${this.#apiConfig.baseUrl}${path}`)
      .pipe(map((packs) => packs.map((pack) => this.#toPublishedView(pack))));
  }

  getPublished(packId: string) {
    return this.#http.get<PublishedTexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/published/${packId}`,
    );
  }

  listPublishedTextures(packId: string, page: number, pageSize = 48) {
    return this.#http
      .get<TexturePage>(
        `${this.#apiConfig.baseUrl}texture-packs/published/${packId}/textures`,
        { params: { page, pageSize } },
      )
      .pipe(
        map(
          (result): TexturePageView => ({
            ...result,
            items: result.items.map((texture) => this.#toTextureView(texture)),
          }),
        ),
      );
  }

  create(request: CreateTexturePack) {
    return this.#http.post<Omit<TexturePack, 'textures' | '_count'>>(
      `${this.#apiConfig.baseUrl}texture-packs`,
      request,
    );
  }

  get(packId: string) {
    return this.#http.get<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
    );
  }

  update(packId: string, request: UpdateTexturePack) {
    return this.#http.patch<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
      request,
    );
  }

  listTextures(packId: string, page: number, pageSize = 48) {
    return this.#http
      .get<TexturePage>(
        `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures`,
        { params: { page, pageSize } },
      )
      .pipe(
        map(
          (result): TexturePageView => ({
            ...result,
            items: result.items.map((texture) => this.#toTextureView(texture)),
          }),
        ),
      );
  }

  upload(packId: string, files: File[]) {
    const body = new FormData();
    for (const file of files) body.append('files', file);

    return this.#http.post<TextureItem[]>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures`,
      body,
    );
  }

  removeTexture(packId: string, textureId: string) {
    return this.#http.delete<{ id: string }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures/${textureId}`,
    );
  }

  remove(packId: string) {
    return this.#http.delete<{ id: string }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
    );
  }

  updatePublication(packId: string, isPublished: boolean) {
    return this.#http.patch<{
      id: string;
      isPublished: boolean;
      publishedAt: string | null;
    }>(`${this.#apiConfig.baseUrl}texture-packs/${packId}/publication`, {
      isPublished,
    });
  }

  #toView(pack: TexturePack): TexturePackView {
    const previewTextures = pack.previewTextures.map((texture) =>
      this.#toTextureView(texture),
    );
    return {
      ...pack,
      previewTextures,
    };
  }

  #toTextureView(texture: TextureItem): TextureItemView {
    return {
      ...texture,
      fileUrl: `${this.#apiConfig.baseUrl}textures/${texture.id}/file`,
    };
  }

  #toPublishedView(pack: PublishedTexturePack): PublishedTexturePackView {
    return {
      ...pack,
      previewTextures: pack.previewTextures.map((texture) =>
        this.#toTextureView(texture),
      ),
    };
  }
}
