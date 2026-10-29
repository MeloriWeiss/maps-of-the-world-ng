import type {
  WorkshopTexture,
  WorkshopTexturePack,
  TexturePageResponse,
} from '../interfaces/workshop-textures';
import { TextureKind } from '@wm/shared/workshop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { toWorkshopTexture } from './utils/workshop-texture.mapper';

/** Загружает наборы и текстуры, доступные в редакторе Workshop. */
@Injectable()
export class WorkshopTexturesService {
  #http = inject(HttpClient);
  #kind: TextureKind = 'SURFACE';
  #page = 1;
  #pageSize = 24;

  readonly packs = signal<WorkshopTexturePack[]>([]);
  readonly selectedPackId = signal<string | null>(null);
  readonly textures = signal<WorkshopTexture[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal('');

  /**
   * Загружает доступные наборы текстур и выбирает набор для указанного типа.
   *
   * @param kind Тип текстур, которые нужно показать.
   */
  load(kind: TextureKind = 'SURFACE') {
    this.#kind = kind;
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

  /**
   * Выбирает набор и начинает загрузку его текстур с первой страницы.
   *
   * @param packId Идентификатор набора текстур.
   */
  loadPack(packId: string) {
    this.selectedPackId.set(packId);
    this.#page = 1;
    this.#loadTexturePage(false);
  }

  /** Загружает следующую страницу текстур, если она доступна. */
  loadMore() {
    if (this.loading() || !this.hasMore()) return;
    this.#page += 1;
    this.#loadTexturePage(true);
  }

  /** Загружает текущую страницу текстур и обновляет список в сигнале. */
  #loadTexturePage(append: boolean) {
    const packId = this.selectedPackId();
    if (!packId) return;

    this.loading.set(true);
    this.error.set('');
    const params = new HttpParams()
      .set('kind', this.#kind)
      .set('page', this.#page)
      .set('pageSize', this.#pageSize);
    this.#http
      .get<TexturePageResponse>(
        `/api/texture-packs/mine/${encodeURIComponent(packId)}/textures`,
        { params },
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const textures = response.items.map(toWorkshopTexture);
          this.textures.update((current) =>
            append ? [...current, ...textures] : textures,
          );
          this.hasMore.set(response.page * response.pageSize < response.total);
        },
        error: () => this.error.set('Не удалось загрузить текстуры пака'),
      });
  }

  /** Оставляет выбранный набор или выбирает первый доступный. */
  #resolveSelectedPackId(packs: WorkshopTexturePack[]): string | null {
    const selectedPackId = this.selectedPackId();
    if (packs.some((pack) => pack.id === selectedPackId)) {
      return selectedPackId;
    }
    return packs[0]?.id ?? null;
  }
}
