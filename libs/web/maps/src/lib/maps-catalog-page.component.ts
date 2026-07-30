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
import { finalize } from 'rxjs';

@Component({
  selector: 'wm-maps-catalog-page',
  imports: [RouterLink, EmptyStateComponent],
  templateUrl: './maps-catalog-page.component.html',
  styleUrl: './maps-catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapsCatalogPageComponent {
  #mapsService = inject(MapsService);
  #destroyRef = inject(DestroyRef);

  readonly maps = signal<PublishedMapSummary[]>([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  constructor() {
    this.load();
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
}
