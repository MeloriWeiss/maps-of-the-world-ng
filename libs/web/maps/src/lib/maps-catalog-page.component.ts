import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import {
  EmptyStateComponent,
  PaginationComponent,
  PaginationService,
} from '@wm/web/common-ui';
import {
  LikeState,
  MapsService,
  PublishedMapSummary,
} from '@wm/web/data-access/maps';
import { AuthService } from '@wm/web/data-access/auth';
import { finalize } from 'rxjs';
import { SvgComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-maps-catalog-page',
  imports: [RouterLink, EmptyStateComponent, SvgComponent, PaginationComponent],
  templateUrl: './maps-catalog-page.component.html',
  styleUrl: './maps-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PaginationService],
})
export class MapsCatalogPageComponent {
  #mapsService = inject(MapsService);
  #destroyRef = inject(DestroyRef);
  #authService = inject(AuthService);
  #route = inject(ActivatedRoute);
  #paginationService = inject(PaginationService);
  #queryParams = toSignal(this.#route.queryParamMap, {
    initialValue: this.#route.snapshot.queryParamMap,
  });
  #reloadVersion = signal(0);

  readonly pageSize = 9;
  readonly maps = signal<PublishedMapSummary[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly updatingLikeIds = signal<ReadonlySet<number>>(new Set());
  readonly isAuthorized = signal(false);

  constructor() {
    effect((onCleanup) => {
      this.#reloadVersion();
      const page = this.#readPage(this.#queryParams());
      this.#paginationService.currentPage.set(page);
      this.isLoading.set(true);
      this.hasError.set(false);
      const subscription = this.#mapsService
        .listCatalog(page, this.pageSize)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (result) => {
            this.maps.set(result.items);
            this.total.set(result.total);
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

  toggleLike(map: PublishedMapSummary) {
    if (
      !this.#authService.isAuthorized$.value ||
      this.updatingLikeIds().has(map.id)
    )
      return;

    this.updatingLikeIds.update((ids) => new Set([...ids, map.id]));
    this.#updateLike(map.id, {
      isLiked: !map.isLiked,
      likesCount: Math.max(0, map.likesCount + (map.isLiked ? -1 : 1)),
    });
    const request = map.isLiked
      ? this.#mapsService.unlike(map.id)
      : this.#mapsService.like(map.id);
    request
      .pipe(
        finalize(() => {
          this.updatingLikeIds.update((ids) => {
            const next = new Set(ids);
            next.delete(map.id);
            return next;
          });
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (state) => this.#updateLike(map.id, state),
        error: () => this.#updateLike(map.id, map),
      });
  }

  #updateLike(mapId: number, { isLiked, likesCount }: LikeState) {
    this.maps.update((maps) =>
      maps.map((map) =>
        map.id === mapId ? { ...map, isLiked, likesCount } : map,
      ),
    );
  }

  #readPage(params: ParamMap) {
    const page = Number(params.get('page'));
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
