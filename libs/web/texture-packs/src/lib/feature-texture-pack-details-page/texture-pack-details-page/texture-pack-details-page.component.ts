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
import { SvgComponent } from '@wm/web/common-ui';
import { TextureKind } from '@wm/shared/workshop';
import { AuthService } from '@wm/web/data-access/auth';
import {
  PublishedTexturePackDetails,
  TexturePacksService,
  TexturePackDetailsFacade,
} from '@wm/web/data-access/texture-packs';
import { finalize } from 'rxjs';
import { SeoService } from '@wm/web/shared';

import { TextureCard } from '../../interfaces/texture-card';
import { toTextureCard } from '../../utils/texture-card.mapper';
import {
  toTextureSections,
  toTextureGallery,
} from '../../utils/texture-gallery.mapper';

/** Публичная страница набора: галерея, отметки и SEO-метаданные. */
@Component({
  selector: 'wm-texture-pack-details-page',
  imports: [RouterLink, SvgComponent],
  templateUrl: './texture-pack-details-page.component.html',
  styleUrl: './texture-pack-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackDetailsPageComponent {
  #route = inject(ActivatedRoute);
  #texturePacksService = inject(TexturePacksService);
  #detailsFacade = inject(TexturePackDetailsFacade);
  #destroyRef = inject(DestroyRef);
  #authService = inject(AuthService);
  #seoService = inject(SeoService);
  #pageSize = 48;

  readonly packId = this.#route.snapshot.paramMap.get('id') ?? '';
  readonly pack = signal<PublishedTexturePackDetails | null>(null);
  readonly textures = signal<Record<TextureKind, TextureCard[]>>({
    SURFACE: [],
    STAMP: [],
  });
  readonly totals = signal<Record<TextureKind, number>>({
    SURFACE: 0,
    STAMP: 0,
  });
  readonly total = signal(0);
  readonly pages = signal<Record<TextureKind, number>>({
    SURFACE: 1,
    STAMP: 1,
  });
  readonly isLoading = signal(true);
  readonly loadingMoreKind = signal<TextureKind | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly loadedTotal = computed(
    () => this.textures().SURFACE.length + this.textures().STAMP.length,
  );
  readonly sections = computed(() =>
    toTextureSections(this.textures(), this.totals(), this.loadingMoreKind()),
  );
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

  /** Загружает набор и первые страницы галереи, затем обновляет метаданные страницы. */
  load() {
    if (!this.packId) {
      this.isLoading.set(false);
      this.errorMessage.set('Некорректный идентификатор текстур-пака.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.#detailsFacade
      .loadPublic(this.packId, this.#pageSize)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ pack, surfaces, stamps }) => {
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
          const gallery = toTextureGallery(surfaces, stamps);

          this.textures.set(gallery.textures);
          this.totals.set(gallery.totals);
          this.total.set(gallery.total);
          this.pages.set(gallery.pages);
        },
        error: () =>
          this.errorMessage.set(
            'Не удалось открыть текстур-пак. Возможно, он снят с публикации.',
          ),
      });
  }

  /** Добавляет следующую страницу выбранного вида текстур. */
  loadMore(kind: TextureKind) {
    if (
      this.textures()[kind].length >= this.totals()[kind] ||
      this.loadingMoreKind()
    )
      return;

    const nextPage = this.pages()[kind] + 1;
    this.loadingMoreKind.set(kind);
    this.errorMessage.set(null);

    this.#texturePacksService
      .listPublicTextures(this.packId, nextPage, this.#pageSize, kind)
      .pipe(
        finalize(() => this.loadingMoreKind.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.textures.update((textures) => ({
            ...textures,
            [kind]: [...textures[kind], ...result.items.map(toTextureCard)],
          }));
          this.totals.update((totals) => ({ ...totals, [kind]: result.total }));
          this.total.set(this.totals().SURFACE + this.totals().STAMP);
          this.pages.update((pages) => ({ ...pages, [kind]: nextPage }));
        },
        error: () =>
          this.errorMessage.set('Не удалось загрузить остальные текстуры.'),
      });
  }

  /** Переключает отметку авторизованного пользователя, блокируя повторный запрос. */
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
}
