import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MapCardComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-profile-page-maps',
  imports: [MapCardComponent],
  templateUrl: './profile-page-maps.component.html',
  styleUrl: './profile-page-maps.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageMapsComponent {}
