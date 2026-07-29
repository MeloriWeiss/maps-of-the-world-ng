import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_CONFIG } from '../shared';
import {
  CreateTexturePack,
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

  list() {
    return this.#http
      .get<TexturePack[]>(`${this.#apiConfig.baseUrl}texture-packs`)
      .pipe(map((packs) => packs.map((pack) => this.#toView(pack))));
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
}
