import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wm/web/common-ui';
import { MapsService, PublishedMapSummary } from '@wm/web/data-access/maps';
import { AuthService } from '@wm/web/data-access/auth';
import { finalize } from 'rxjs';
import { SvgComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-maps-catalog-page',
  imports: [RouterLink, EmptyStateComponent, SvgComponent],
  templateUrl: './maps-catalog-page.component.html',
  styleUrl: './maps-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapsCatalogPageComponent {
  #mapsService = inject(MapsService);
  #destroyRef = inject(DestroyRef);
  #authService = inject(AuthService);

  readonly maps = signal<PublishedMapSummary[]>([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly updatingLikeId = signal<number | null>(null);
  readonly isAuthorized = signal(false);

  constructor() {
    this.load();
    this.#authService.isAuthorized$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isAuthorized) => {
        this.isAuthorized.set(isAuthorized);
      });
  }

  load() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.#mapsService
      .listCatalog()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (maps) => this.maps.set(maps),
        error: () => this.hasError.set(true),
      });
  }

  toggleLike(map: PublishedMapSummary) {
    if (!this.#authService.isAuthorized$.value || this.updatingLikeId()) return;
    const isLiked = map.isLiked;
    this.updatingLikeId.set(map.id);
    const request = isLiked
      ? this.#mapsService.unlike(map.id)
      : this.#mapsService.like(map.id);
    request
      .pipe(
        finalize(() => this.updatingLikeId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ isLiked: nextIsLiked, likesCount }) => {
        this.maps.update((maps) =>
          maps.map((item) =>
            item.id === map.id
              ? { ...item, isLiked: nextIsLiked, likesCount }
              : item,
          ),
        );
      });
  }
}
