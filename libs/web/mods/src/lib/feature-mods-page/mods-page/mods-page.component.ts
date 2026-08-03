import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { MockService } from '@wm/web/data-access/mock';
import { AsyncPipe, Location } from '@angular/common';
import {
  ErrorComponent,
  ImagesSliderComponent,
  SearchInputComponent,
  SvgComponent,
} from '@wm/web/common-ui';
import { OwlOptions } from 'ngx-owl-carousel-o';
import {
  NavigationHistoryService,
  CommentsSectionComponent,
  SeoService,
} from '@wm/web/web-shared';

@Component({
  selector: 'wm-mods-page',
  standalone: true,
  imports: [
    AsyncPipe,
    SvgComponent,
    ImagesSliderComponent,
    ErrorComponent,
    CommentsSectionComponent,
    SearchInputComponent,
  ],
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
  #seoService = inject(SeoService);

  comments = this.#mockService.getComments();

  mode$ = this.#activatedRoute.paramMap.pipe(
    map((pm) => Number(pm.get('id'))),
    switchMap((id) => this.#mockService.getModeById(id)),
    tap((mode) => {
      if (!mode) return;

      this.#seoService.update(
        {
          title: mode.name,
          description: mode.description,
          index: true,
          canonicalPath: `/mods/${mode.id}`,
          image: mode.images[0]?.url,
          type: 'article',
        },
        `/mods/${mode.id}`,
      );
    }),
  );

  customOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false,
    navSpeed: 700,
    navText: ['', ''],
    margin: 8,
    responsive: {
      0: {
        items: 2,
        margin: 8,
      },
      480: {
        items: 3,
        margin: 10,
      },
      768: {
        items: 4,
        margin: 12,
      },
      1024: {
        items: 4,
        margin: 18,
      },
      // 0: {
      //   items: 1,
      // },
      // 300: {
      //   items: 2,
      // },
      // 400: {
      //   items: 3,
      // },
      // 500: {
      //   items: 4,
      // },
      // 600: {
      //   items: 5,
      // },
    },
    nav: false,
    responsiveRefreshRate: 100,
  };

  back() {
    if (this.#navigationService.hasPrevRoutes()) {
      return this.#location.back();
    }
    this.#router.navigate(['mods']).then();
  }
}
