import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

export interface WorkshopTexture {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  imageUrl: string;
}

interface TextureResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

@Injectable()
export class WorkshopTexturesService {
  #http = inject(HttpClient);

  readonly textures = signal<WorkshopTexture[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.#http
      .get<TextureResponse[]>('/api/textures')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (textures) => this.textures.set(textures.map(this.#toTexture)),
        error: () => this.error.set('Не удалось загрузить библиотеку текстур'),
      });
  }

  upload(file: File) {
    const formData = new FormData();
    formData.set('name', this.#nameWithoutExtension(file.name));
    formData.set('file', file);
    this.uploading.set(true);
    this.error.set('');

    return this.#http
      .post<TextureResponse>('/api/textures', formData)
      .pipe(finalize(() => this.uploading.set(false)));
  }

  add(texture: TextureResponse): WorkshopTexture {
    const item = this.#toTexture(texture);
    this.textures.update((textures) => [item, ...textures]);
    return item;
  }

  #toTexture = (texture: TextureResponse): WorkshopTexture => ({
    ...texture,
    imageUrl: `/api/textures/${encodeURIComponent(texture.id)}/file`,
  });

  #nameWithoutExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return (dotIndex > 0 ? filename.slice(0, dotIndex) : filename).slice(
      0,
      120,
    );
  }
}
