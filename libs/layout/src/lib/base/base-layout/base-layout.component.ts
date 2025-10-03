import { ChangeDetectionStrategy, Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { HeaderComponent } from '@wm/layout/base/header/header.component';

@Component({
  selector: 'wm-base-layout',
  imports: [
    RouterOutlet,
    HeaderComponent
  ],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseLayoutComponent {

}
