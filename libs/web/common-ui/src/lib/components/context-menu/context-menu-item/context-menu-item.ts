import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ContextMenuOption } from '@wm/web/data-access/shared';
import { SvgComponent } from '../../svg/svg.component';
import { ContextMenuService } from '../context-menu.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[wm-menu-item]',
  imports: [SvgComponent],
  templateUrl: './context-menu-item.html',
  styleUrl: './context-menu-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[disabled]': 'option().disabled',
    '(click)': 'otItemClick($event)',
  },
})
export class ContextMenuItemComponent {
  #contextMenuService = inject(ContextMenuService);

  option = input.required<ContextMenuOption>();

  otItemClick(event: MouseEvent) {
    if (this.option().disabled) {
      event.stopPropagation();
      return;
    }

    console.log('CONTEXT MENU ITEM');
    this.option().action();
    this.#contextMenuService.close();
  }
}
