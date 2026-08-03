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
import { SvgComponent } from '@wm/web/common-ui';
import { AuthService } from '@wm/web/data-access/auth';
import {
  PublishedTexturePackDetails,
  TextureItemView,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize, forkJoin } from 'rxjs';
import { SeoService } from '@wm/web/web-shared';

interface TextureDetailsCard extends TextureItemView {
  displaySize: string;
}

@Component({
  selector: 'wm-texture-pack-details-page',
  imports: [RouterLink, EmptyStateComponent, SvgComponent],
  templateUrl: './texture-pack-details-page.component.html',
  styleUrl: './texture-pack-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackDetailsPageComponent {
  #route = inject(ActivatedRoute);
  #texturePacksService = inject(TexturePacksService);
  #destroyRef = inject(DestroyRef);
  #authService = inject(AuthService);
  #seoService = inject(SeoService);
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
  readonly isAuthorized = signal(false);
  readonly isLiked = signal(false);
  readonly isUpdatingLike = signal(false);

  constructor() {
    this.load();
    this.#authService.isAuthorized$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isAuthorized) => {
        this.isAuthorized.set(isAuthorized);
      });
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
      pack: this.#texturePacksService.getPublicPack(this.packId),
      textures: this.#texturePacksService.listPublicTextures(
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
          this.#seoService.update(
            {
              title: pack.name,
              description:
                pack.description?.trim() ||
                `Набор текстур «${pack.name}» от автора ${pack.author.nickname}.`,
              index: true,
              canonicalPath: `/texture-packs/${pack.id}`,
              type: 'article',
            },
            `/texture-packs/${pack.id}`,
          );
          this.isLiked.set(pack.isLiked);
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
      .listPublicTextures(this.packId, nextPage, this.#pageSize)
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

  toggleLike() {
    const pack = this.pack();
    if (!pack || !this.isAuthorized() || this.isUpdatingLike()) return;
    this.isUpdatingLike.set(true);
    const request = this.isLiked()
      ? this.#texturePacksService.unlike(pack.id)
      : this.#texturePacksService.like(pack.id);
    request
      .pipe(
        finalize(() => this.isUpdatingLike.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ isLiked, likesCount }) => {
        this.isLiked.set(isLiked);
        this.pack.update((current) =>
          current ? { ...current, likesCount } : current,
        );
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
