import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationManagerComponent } from '@wm/web/web-shared';
import { ModalHostComponent } from '@wm/web/common-ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationManagerComponent, ModalHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
