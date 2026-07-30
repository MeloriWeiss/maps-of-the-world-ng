import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wm/web/common-ui';
import {
  PublishedTexturePackDetails,
  TextureItemView,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize, forkJoin } from 'rxjs';

interface TextureDetailsCard extends TextureItemView {
  displaySize: string;
}

@Component({
  selector: 'wm-texture-pack-details-page',
  imports: [RouterLink, EmptyStateComponent],
  templateUrl: './texture-pack-details-page.component.html',
  styleUrl: './texture-pack-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackDetailsPageComponent {
  #route = inject(ActivatedRoute);
  #texturePacksService = inject(TexturePacksService);
  #destroyRef = inject(DestroyRef);
  #pageSize = 48;

  readonly packId = this.#route.snapshot.paramMap.get('id') ?? '';
  readonly pack = signal<PublishedTexturePackDetails | null>(null);
  readonly textures = signal<TextureDetailsCard[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasMore = computed(() => this.textures().length < this.total());

  constructor() {
    this.load();
  }

  load() {
    if (!this.packId) {
      this.isLoading.set(false);
      this.errorMessage.set('Некорректный идентификатор текстур-пака.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      pack: this.#texturePacksService.getPublished(this.packId),
      textures: this.#texturePacksService.listPublishedTextures(
        this.packId,
        1,
        this.#pageSize,
      ),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ pack, textures }) => {
          this.pack.set(pack);
          this.textures.set(
            textures.items.map((texture) => this.#toCard(texture)),
          );
          this.total.set(textures.total);
          this.page.set(1);
        },
        error: () =>
          this.errorMessage.set(
            'Не удалось открыть текстур-пак. Возможно, он снят с публикации.',
          ),
      });
  }

  loadMore() {
    if (!this.hasMore() || this.isLoadingMore()) return;

    const nextPage = this.page() + 1;
    this.isLoadingMore.set(true);
    this.errorMessage.set(null);
    this.#texturePacksService
      .listPublishedTextures(this.packId, nextPage, this.#pageSize)
      .pipe(
        finalize(() => this.isLoadingMore.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.textures.update((textures) => [
            ...textures,
            ...result.items.map((texture) => this.#toCard(texture)),
          ]);
          this.total.set(result.total);
          this.page.set(nextPage);
        },
        error: () =>
          this.errorMessage.set('Не удалось загрузить остальные текстуры.'),
      });
  }

  #toCard(texture: TextureItemView): TextureDetailsCard {
    return {
      ...texture,
      displaySize:
        texture.size < 1_000_000
          ? `${Math.ceil(texture.size / 1_000)} КБ`
          : `${(texture.size / 1_000_000).toFixed(1)} МБ`,
    };
  }
}
