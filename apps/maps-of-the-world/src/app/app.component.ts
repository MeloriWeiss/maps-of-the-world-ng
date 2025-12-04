import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { NavigationManagerComponent } from '@wm/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationManagerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
