import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { MockService } from '@wm/data-access/mock/mock.service';
import { AsyncPipe, Location } from '@angular/common';
import { ImagesSliderComponent, SvgComponent } from '@wm/common-ui';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { NavigationHistoryService } from '@wm/shared';

@Component({
  selector: 'wm-mods-page',
  standalone: true,
  imports: [AsyncPipe, SvgComponent, ImagesSliderComponent],
  templateUrl: './mods-page.component.html',
  styleUrl: './mods-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsPageComponent {
  #activatedRoute = inject(ActivatedRoute);
  #location = inject(Location);
  #router = inject(Router);
  #mockService = inject(MockService);
  #navigationService = inject(NavigationHistoryService);

  mode$ = this.#activatedRoute.paramMap.pipe(
    map((pm) => Number(pm.get('id'))),
    switchMap((id) => this.#mockService.getModeById(id))
  );

  customOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false,
    navSpeed: 700,
    navText: ['', ''],
    margin: 18,
    responsive: {
      0: {
        items: 1,
      },
      300: {
        items: 2,
      },
      400: {
        items: 3,
      },
      500: {
        items: 4,
      },
      600: {
        items: 5,
      },
    },
    nav: false,
  };

  back() {
    if (this.#navigationService.hasPrevRoutes()) {
      return this.#location.back();
    }
    this.#router.navigate(['mods']).then();
  }
}
