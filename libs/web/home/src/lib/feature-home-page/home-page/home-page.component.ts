import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SvgComponent } from '@wm/web/common-ui';
import { MapsService, PublishedMapPage } from '@wm/web/data-access/maps';
import { catchError, of } from 'rxjs';

const EMPTY_MAP_PAGE: PublishedMapPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 3,
};

@Component({
  selector: 'wm-home-page',
  imports: [AsyncPipe, RouterLink, SvgComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  #mapsService = inject(MapsService);

  protected readonly featuredMaps$ = this.#mapsService
    .listCatalog(1, 3)
    .pipe(catchError(() => of(EMPTY_MAP_PAGE)));
}
