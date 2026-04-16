import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MockService } from '@wm/web/data-access/mock';
import { ModsFiltersItemComponent } from './mods-filters-item';
import { SvgComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-mods-list-sidebar',
  standalone: true,
  imports: [AsyncPipe, ModsFiltersItemComponent, SvgComponent],
  templateUrl: './mods-list-sidebar.component.html',
  styleUrl: './mods-list-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsListSidebarComponent {
  #mockService = inject(MockService);
  isOpened = signal<boolean>(false);
  modsFilters$ = this.#mockService.getModsFilters();

  getActiveFilterLabel() {
    return 'Выберите фильтр...';
  }

  toggleMenu() {
    this.isOpened.update((v) => !v);
  }
}
