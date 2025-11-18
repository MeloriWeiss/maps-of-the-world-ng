import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { ModeCardComponent, SvgComponent } from '@wm/common-ui';
import { ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'wm-profile-page',
  imports: [
    ReactiveFormsModule,
    SvgComponent,
    ModeCardComponent,
    AsyncPipe,
    RouterLinkActive,
    RouterLink,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  protected readonly booleanAttribute = booleanAttribute;
  protected readonly isFinite = isFinite;
}
