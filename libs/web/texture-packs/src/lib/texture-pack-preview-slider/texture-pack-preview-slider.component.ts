import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ImagesSliderComponent } from '@wm/web/common-ui';
import { TextureItemView } from '@wm/web/data-access/texture-packs';
import { OwlOptions } from 'ngx-owl-carousel-o';

type TexturePreviewSize = 'regular' | 'large';

@Component({
  selector: 'wm-texture-pack-preview-slider',
  imports: [ImagesSliderComponent],
  templateUrl: './texture-pack-preview-slider.component.html',
  styleUrl: './texture-pack-preview-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TexturePackPreviewSliderComponent {
  textures = input.required<TextureItemView[]>();
  size = input<TexturePreviewSize>('regular');

  slides = computed(() =>
    this.textures().map(({ fileUrl, name }) => ({
      url: fileUrl,
      alt: name,
    })),
  );

  options = computed<OwlOptions>(() => ({
    ...(this.size() === 'large'
      ? {
          loop: true,
          mouseDrag: true,
          touchDrag: true,
          pullDrag: false,
          dots: false,
          nav: false,
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
          },
          responsiveRefreshRate: 100,
        }
      : {
          loop: false,
          rewind: this.textures().length > 3,
          mouseDrag: true,
          touchDrag: true,
          pullDrag: false,
          autoWidth: true,
          dots: false,
          nav: false,
          navSpeed: 500,
          margin: 6,
        }),
  }));
}
