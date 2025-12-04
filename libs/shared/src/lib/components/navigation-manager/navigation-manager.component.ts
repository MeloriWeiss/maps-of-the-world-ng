import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationHistoryService } from './navigation-history.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'wm-navigation-manager',
  imports: [],
  templateUrl: './navigation-manager.component.html',
  styleUrl: './navigation-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationManagerComponent {
  #navigationService = inject(NavigationHistoryService);

  constructor() {
    this.#navigationService.routerEvents$
      .pipe(takeUntilDestroyed())
      .subscribe();
  }
}
