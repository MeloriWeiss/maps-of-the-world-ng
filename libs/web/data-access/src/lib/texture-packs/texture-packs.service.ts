import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../shared';
import {
  CreateTexturePack,
  PublishedTexturePack,
  PublishedTexturePackView,
  TextureItem,
  TextureItemView,
  TexturePack,
  TexturePackView,
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

  create(request: CreateTexturePack) {
    return this.#http.post<Omit<TexturePack, 'textures' | '_count'>>(
      `${this.#apiConfig.baseUrl}texture-packs`,
      request,
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
