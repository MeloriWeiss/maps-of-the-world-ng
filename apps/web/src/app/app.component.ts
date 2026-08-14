import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationManagerComponent } from '@wm/web/web-shared';
import { ModalHostComponent, ToastHostComponent } from '@wm/web/common-ui';
import { SiteVisitTrackerService } from './site-visit-tracker.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavigationManagerComponent,
    ModalHostComponent,
    ToastHostComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly #siteVisitTracker = inject(SiteVisitTrackerService);

  constructor() {
    this.#siteVisitTracker.track();
  }
}
