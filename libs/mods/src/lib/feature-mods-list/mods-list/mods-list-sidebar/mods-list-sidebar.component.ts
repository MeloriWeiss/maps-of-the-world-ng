import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MockService } from '@wm/data-access/mock/mock.service';
import { ModsFiltersItemComponent } from './mods-filters-item/mods-filters-item.component';

@Component({
  selector: 'wm-mods-list-sidebar',
  imports: [
    AsyncPipe,
    ModsFiltersItemComponent,
  ],
  templateUrl: './mods-list-sidebar.component.html',
  styleUrl: './mods-list-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsListSidebarComponent {
  #mockService = inject(MockService);

  modsFilters$ = this.#mockService.getModsFilters();
}
