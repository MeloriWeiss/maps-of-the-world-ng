import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationManagerComponent } from '@wm/web/shared';
import { ModalHostComponent, ToastHostComponent } from '@wm/web/common-ui';
import { SiteVisitTrackerService } from '@wm/web/data-access/site-visits';
import { RouterScrollService } from '@wm/web/shared';

/** Корневой компонент, который размещает маршрутизируемые страницы приложения. */
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
    inject(RouterScrollService);
    this.#siteVisitTracker.track();
  }
}
