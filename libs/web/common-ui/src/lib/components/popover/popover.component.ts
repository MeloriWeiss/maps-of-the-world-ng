import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';
import { ClickOutsideDirective } from '../../directives';

export type PopoverAlignment = 'start' | 'center' | 'end';
export type PopoverAppearance = 'default' | 'bare';
export interface PopoverPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'wm-popover',
  imports: [ClickOutsideDirective],
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
  host: {
    '[class.is-open]': 'isOpen()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverComponent {
  alignment = input<PopoverAlignment>('end');
  appearance = input<PopoverAppearance>('default');
  position = input<PopoverPosition | null>(null);
  closeOnContentClick = input(true);
  ariaLabel = input('Контекстное меню');

  openedChange = output<boolean>();
  isOpen = signal(false);

  toggle() {
    this.setOpenState(!this.isOpen());
  }

  close() {
    this.setOpenState(false);
  }

  onContentClick() {
    if (this.closeOnContentClick()) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  setOpenState(open: boolean) {
    if (this.isOpen() === open) return;
    this.isOpen.set(open);
    this.openedChange.emit(open);
  }
}
