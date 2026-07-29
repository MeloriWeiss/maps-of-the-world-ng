import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MapsService, MapSummary } from '@wm/web/data-access/maps';
import { EmptyStateComponent } from '@wm/web/common-ui';

type MapList = 'drafts' | 'published';

@Component({
  selector: 'wm-profile-page-maps',
  imports: [RouterLink, EmptyStateComponent],
  templateUrl: './profile-page-maps.component.html',
  styleUrl: './profile-page-maps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageMapsComponent {
  #mapsService = inject(MapsService);
  #route = inject(ActivatedRoute);
  #destroyRef = inject(DestroyRef);

  readonly profileId =
    this.#route.parent?.parent?.snapshot.paramMap.get('id') ?? 'me';
  readonly isOwnProfile = this.profileId === 'me';
  readonly maps = signal<MapSummary[]>([]);
  readonly activeList = signal<MapList>(
    this.isOwnProfile ? 'drafts' : 'published',
  );
  readonly isLoading = signal(true);
  readonly publishingMapId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly draftMaps = computed(() =>
    this.maps().filter((map) => !map.isPublished),
  );
  readonly publishedMaps = computed(() =>
    this.maps().filter((map) => map.isPublished),
  );
  readonly visibleMaps = computed(() =>
    this.activeList() === 'drafts' ? this.draftMaps() : this.publishedMaps(),
  );

  constructor() {
    this.loadMaps();
  }

  loadMaps() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const maps$ = this.isOwnProfile
      ? this.#mapsService.listMine()
      : this.#mapsService.listPublished(Number(this.profileId));

    maps$
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (maps) => this.maps.set(maps),
        error: () => this.errorMessage.set('Не удалось загрузить карты.'),
      });
  }

  selectList(list: MapList) {
    this.activeList.set(list);
  }

  togglePublication(map: MapSummary) {
    if (this.publishingMapId() !== null) return;

    this.publishingMapId.set(map.id);
    this.errorMessage.set(null);
    this.#mapsService
      .updatePublication(map.id, !map.isPublished)
      .pipe(
        finalize(() => this.publishingMapId.set(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.activeList.set(map.isPublished ? 'drafts' : 'published');
          this.loadMaps();
        },
        error: () =>
          this.errorMessage.set('Не удалось изменить статус публикации карты.'),
      });
  }
}
