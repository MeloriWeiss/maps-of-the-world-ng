import type { ModsFilter } from './mods-filters-item.component.types';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { CollapsibleDirective, SvgComponent } from '@wm/web/common-ui';

/** Отображает один фильтр списка и сообщает о выборе значения. */
@Component({
  selector: 'wm-mods-filters-item',
  imports: [CollapsibleDirective, SvgComponent],
  templateUrl: './mods-filters-item.component.html',
  styleUrl: './mods-filters-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsFiltersItemComponent {
  filter = input.required<ModsFilter>();

  isOpened = signal(false);
  isActive = signal(false);

  toggleOpened(event: MouseEvent) {
    event.stopPropagation();

    this.isOpened.set(!this.isOpened());
  }

  toggleActive() {
    this.isActive.set(!this.isActive());
  }
}
