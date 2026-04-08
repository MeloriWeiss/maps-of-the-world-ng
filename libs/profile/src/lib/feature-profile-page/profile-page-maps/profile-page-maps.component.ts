import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapCardComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-profile-page-maps',
  imports: [MapCardComponent],
  templateUrl: './profile-page-maps.component.html',
  styleUrl: './profile-page-maps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageMapsComponent {}
