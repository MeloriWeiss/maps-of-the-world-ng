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
  TexturePackLikeState,
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

  listPublicCatalog() {
    return this.#listPublic('texture-packs');
  }

  listPublicByAuthor(authorUserId: number) {
    return this.#listPublic('texture-packs', authorUserId);
  }

  #listPublic(path: string, authorId?: number) {
    return this.#http
      .get<PublishedTexturePack[]>(`${this.#apiConfig.baseUrl}${path}`, {
        params: authorId === undefined ? {} : { authorId },
      })
      .pipe(map((packs) => packs.map((pack) => this.#toPublishedView(pack))));
  }

  getPublicPack(packId: string) {
    return this.#http.get<PublishedTexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
    );
  }

  listPublicTextures(packId: string, page: number, pageSize = 48) {
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

  create(request: CreateTexturePack) {
    return this.#http.post<Omit<TexturePack, 'textures' | '_count'>>(
      `${this.#apiConfig.baseUrl}texture-packs`,
      request,
    );
  }

  getOwned(packId: string) {
    return this.#http.get<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/mine/${packId}`,
    );
  }

  update(packId: string, request: UpdateTexturePack) {
    return this.#http.patch<TexturePackDetails>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}`,
      request,
    );
  }

  listOwnedTextures(packId: string, page: number, pageSize = 48) {
    return this.#http
      .get<TexturePage>(
        `${this.#apiConfig.baseUrl}texture-packs/mine/${packId}/textures`,
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

  removeOwnedTexture(packId: string, textureId: string) {
    return this.#http.delete<{ id: string }>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/textures/${textureId}`,
    );
  }

  removeOwned(packId: string) {
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

  like(packId: string) {
    return this.#http.post<TexturePackLikeState>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/like`,
      {},
    );
  }

  unlike(packId: string) {
    return this.#http.delete<TexturePackLikeState>(
      `${this.#apiConfig.baseUrl}texture-packs/${packId}/like`,
    );
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
