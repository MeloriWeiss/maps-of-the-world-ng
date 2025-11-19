import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { MockService } from '@wm/data-access/mock/mock.service';
import { AsyncPipe } from '@angular/common';
import { ImagesSliderComponent, SvgComponent } from '@wm/common-ui';
import { OwlOptions } from 'ngx-owl-carousel-o';

@Component({
  selector: 'wm-mods-page',
  standalone: true,
  imports: [AsyncPipe, RouterLink, SvgComponent, ImagesSliderComponent],
  templateUrl: './mods-page.component.html',
  styleUrl: './mods-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsPageComponent {
  #activatedRoute = inject(ActivatedRoute);
  #mockService = inject(MockService);

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
}
