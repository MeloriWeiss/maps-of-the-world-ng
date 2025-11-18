import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CollapsibleDirective, SvgComponent } from '@wm/common-ui';

@Component({
  selector: 'wm-mods-filters-item',
  imports: [CollapsibleDirective, SvgComponent],
  templateUrl: './mods-filters-item.component.html',
  styleUrl: './mods-filters-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsFiltersItemComponent {
  filter = input.required<any>();

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
