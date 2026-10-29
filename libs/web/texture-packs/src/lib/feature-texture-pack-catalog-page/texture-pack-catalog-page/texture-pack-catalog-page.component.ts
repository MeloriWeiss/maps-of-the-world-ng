import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import {
  PublishedTexturePackView,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize } from 'rxjs';
import {
  EmptyStateComponent,
  PaginationComponent,
  PaginationService,
  SvgComponent,
} from '@wm/web/common-ui';
import { AuthService } from '@wm/web/data-access/auth';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TexturePackPreviewSliderComponent } from '../../texture-pack-preview-slider/texture-pack-preview-slider.component';

/** Страница публичного каталога опубликованных наборов текстур. */
@Component({
  selector: 'wm-texture-pack-catalog-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    TexturePackPreviewSliderComponent,
    SvgComponent,
    PaginationComponent,
  ],
  templateUrl: './texture-pack-catalog-page.component.html',
  styleUrl: './texture-pack-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PaginationService],
})
export class TexturePackCatalogPageComponent {
  #texturePacksService = inject(TexturePacksService);
  #authService = inject(AuthService);
  #destroyRef = inject(DestroyRef);
  #route = inject(ActivatedRoute);
  #paginationService = inject(PaginationService);
  #queryParams = toSignal(this.#route.queryParamMap, {
    initialValue: this.#route.snapshot.queryParamMap,
  });
  #reloadVersion = signal(0);

  readonly pageSize = 9;
  authorUserId = input<number>();
  embedded = input(false);
  packs = signal<PublishedTexturePackView[]>([]);
  isLoading = signal(true);
  hasError = signal(false);
  isAuthorized = signal(false);
  updatingLikeId = signal<string | null>(null);
  total = signal(0);

  constructor() {
    effect((onCleanup) => {
      this.#reloadVersion();
      const authorUserId = this.authorUserId();
      const page = this.#readPage(this.#queryParams());
      this.isLoading.set(true);
      this.hasError.set(false);

      if (authorUserId !== undefined) {
        const subscription = this.#texturePacksService
          .listPublicByAuthor(authorUserId)
          .pipe(finalize(() => this.isLoading.set(false)))
          .subscribe({
            next: (packs) => {
              this.packs.set(packs);
              this.total.set(packs.length);
            },
            error: () => this.hasError.set(true),
          });
        onCleanup(() => subscription.unsubscribe());
        return;
      }

      const subscription = this.#texturePacksService
        .listPublicCatalog(page, this.pageSize)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (result) => {
            this.packs.set(result.items);
            this.total.set(result.total);
            this.#paginationService.currentPage.set(result.page);
            this.#paginationService.maxPage.set(
              Math.max(1, Math.ceil(result.total / result.pageSize)),
            );
          },
          error: () => this.hasError.set(true),
        });
      onCleanup(() => subscription.unsubscribe());
    });
    this.#authService.isAuthorized$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isAuthorized) => {
        this.isAuthorized.set(isAuthorized);
      });
  }

  load() {
    this.#reloadVersion.update((version) => version + 1);
  }

  toggleLike(pack: PublishedTexturePackView) {
    if (!this.isAuthorized() || this.updatingLikeId()) return;
    const request = pack.isLiked
      ? this.#texturePacksService.unlike(pack.id)
      : this.#texturePacksService.like(pack.id);
    this.updatingLikeId.set(pack.id);
    request
      .pipe(
        finalize(() => this.updatingLikeId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ isLiked, likesCount }) => {
        this.packs.update((packs) =>
          packs.map((item) =>
            item.id === pack.id ? { ...item, isLiked, likesCount } : item,
          ),
        );
      });
  }

  #readPage(params: ParamMap) {
    const page = Number(params.get('page'));
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
