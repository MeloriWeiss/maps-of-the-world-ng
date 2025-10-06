import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { SvgComponent } from '@wm/common-ui';
import { ReactiveFormsModule } from '@angular/forms';
import { MapCardComponent } from './map-card/map-card.component';

@Component({
  selector: 'wm-profile-page',
  imports: [ReactiveFormsModule, SvgComponent, MapCardComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  protected readonly booleanAttribute = booleanAttribute;
  protected readonly isFinite = isFinite;
}
