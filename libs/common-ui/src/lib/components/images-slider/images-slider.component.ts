import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';
import { SvgComponent } from '../svg/svg.component';
import { SliderItem } from '@wm/data-access/shared';

@Component({
  selector: 'wm-images-slider',
  imports: [CarouselModule, SvgComponent],
  templateUrl: './images-slider.component.html',
  styleUrl: './images-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagesSliderComponent {
  options = input.required<OwlOptions>();
  slides = input.required<SliderItem[]>();
}
