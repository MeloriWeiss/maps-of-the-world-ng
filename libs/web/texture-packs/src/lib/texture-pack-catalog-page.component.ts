import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PublishedTexturePackView,
  TexturePacksService,
} from '@wm/web/data-access/texture-packs';
import { finalize } from 'rxjs';
import { EmptyStateComponent, SvgComponent } from '@wm/web/common-ui';
import { AuthService } from '@wm/web/data-access/auth';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TexturePackPreviewSliderComponent } from './texture-pack-preview-slider/texture-pack-preview-slider.component';

@Component({
  selector: 'wm-texture-pack-catalog-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    TexturePackPreviewSliderComponent,
    SvgComponent,
  ],
  templateUrl: './texture-pack-catalog-page.component.html',
  styleUrl: './texture-pack-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackCatalogPageComponent {
  #texturePacksService = inject(TexturePacksService);
  #authService = inject(AuthService);
  #destroyRef = inject(DestroyRef);

  authorUserId = input<number>();
  embedded = input(false);
  packs = signal<PublishedTexturePackView[]>([]);
  isLoading = signal(true);
  hasError = signal(false);
  isAuthorized = signal(false);
  updatingLikeId = signal<string | null>(null);

  constructor() {
    effect(() => this.load(this.authorUserId()));
    this.#authService.isAuthorized$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isAuthorized) => {
        this.isAuthorized.set(isAuthorized);
      });
  }

  load(authorUserId = this.authorUserId()) {
    this.isLoading.set(true);
    this.hasError.set(false);
    const request =
      authorUserId === undefined
        ? this.#texturePacksService.listPublicCatalog()
        : this.#texturePacksService.listPublicByAuthor(authorUserId);
    request.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (packs) => this.packs.set(packs),
      error: () => this.hasError.set(true),
    });
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
}
