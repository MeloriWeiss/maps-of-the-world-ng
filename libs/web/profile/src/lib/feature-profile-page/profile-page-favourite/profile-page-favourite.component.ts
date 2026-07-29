import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-profile-page-favourite',
  imports: [EmptyStateComponent],
  templateUrl: './profile-page-favourite.component.html',
  styleUrl: './profile-page-favourite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageFavouriteComponent {}
