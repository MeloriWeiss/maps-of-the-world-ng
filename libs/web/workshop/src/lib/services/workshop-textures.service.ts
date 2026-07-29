import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface WorkshopTexturePack {
  id: string;
  name: string;
  _count: {
    textures: number;
  };
}

interface TextureResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

interface TexturePageResponse {
  items: TextureResponse[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class WorkshopTexturesService {
  #http = inject(HttpClient);
  #page = 1;
  #pageSize = 24;

  readonly packs = signal<WorkshopTexturePack[]>([]);
  readonly selectedPackId = signal<string | null>(null);
  readonly textures = signal<WorkshopTexture[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal('');

  load() {
    this.loading.set(true);
    this.error.set('');
    this.#http.get<WorkshopTexturePack[]>('/api/texture-packs/mine').subscribe({
      next: (packs) => {
        this.packs.set(packs);
        const selectedPackId = this.#resolveSelectedPackId(packs);
        this.selectedPackId.set(selectedPackId);
        if (selectedPackId) {
          this.loadPack(selectedPackId);
          return;
        }
        this.textures.set([]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Не удалось загрузить текстур-паки');
      },
    });
  }

  loadPack(packId: string) {
    this.selectedPackId.set(packId);
    this.#page = 1;
    this.#loadTexturePage(false);
  }

  loadMore() {
    if (this.loading() || !this.hasMore()) return;
    this.#page += 1;
    this.#loadTexturePage(true);
  }

  #loadTexturePage(append: boolean) {
    const packId = this.selectedPackId();
    if (!packId) return;

    this.loading.set(true);
    this.error.set('');
    const params = new HttpParams()
      .set('page', this.#page)
      .set('pageSize', this.#pageSize);
    this.#http
      .get<TexturePageResponse>(
        `/api/texture-packs/${encodeURIComponent(packId)}/textures`,
        { params },
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const textures = response.items.map(this.#toTexture);
          this.textures.update((current) =>
            append ? [...current, ...textures] : textures,
          );
          this.hasMore.set(response.page * response.pageSize < response.total);
        },
        error: () => this.error.set('Не удалось загрузить текстуры пака'),
      });
  }

  #resolveSelectedPackId(packs: WorkshopTexturePack[]): string | null {
    const selectedPackId = this.selectedPackId();
    if (packs.some((pack) => pack.id === selectedPackId)) {
      return selectedPackId;
    }
    return packs[0]?.id ?? null;
  }

  #toTexture = (texture: TextureResponse): WorkshopTexture => ({
    ...texture,
    imageUrl: `/api/textures/${encodeURIComponent(texture.id)}/file`,
  });
}
