import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Mode } from '@wm/data-access/mods';
import { CollapsibleDirective, ImagesSliderComponent, SvgComponent } from '@wm/common-ui';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

@Component({
  selector: 'wm-mode-card',
  imports: [
    SvgComponent,
    CarouselModule,
    CollapsibleDirective,
    ImagesSliderComponent,
  ],
  templateUrl: './mode-card.component.html',
  styleUrl: './mode-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeCardComponent {
  mode = input.required<Mode>();

  isOpened = signal(false);

  toggleOpened() {
    this.isOpened.set(!this.isOpened());
  }

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
