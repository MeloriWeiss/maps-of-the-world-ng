import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { SvgComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-map-card',
  imports: [SvgComponent],
  templateUrl: './map-card.component.html',
  styleUrl: './map-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapCardComponent {
  isLikeable = input.required<boolean, unknown>({
    transform: booleanAttribute,
  });
}
