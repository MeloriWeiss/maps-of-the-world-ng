import {
  Directive,
  ElementRef,
  inject,
  input,
  TemplateRef,
} from '@angular/core';
import { ContextMenuService } from '../components';
import { ContextMenuComponent } from '../components/context-menu/context-menu';
import { ContextMenuConfig } from '@wm/web/data-access/shared';

@Directive({
  selector: '[wmContextMenuTrigger]',
  host: {
    '(click)': 'onLeftClick($event)',
    '(contextmenu)': 'onRightClick($event)',
  },
})
export class ContextMenuTriggerDirective {
  #contextMenuService = inject(ContextMenuService);
  #element = inject(ElementRef);

  template = input<TemplateRef<any>>(undefined, {
    alias: 'wmContextMenuTrigger',
  });

  wmMenuMode = input<ContextMenuConfig['mode']>('dynamic');
  wmMenuEvent = input<'click' | 'contextmenu'>('contextmenu');
  wmOffset = input<{ x?: number; y?: number }>();

  onLeftClick(event: MouseEvent) {
    if (this.wmMenuEvent() === 'click') {
      this.handleOpen(event);
    }
  }

  onRightClick(event: MouseEvent) {
    if (this.wmMenuEvent() === 'contextmenu') {
      this.handleOpen(event);
    }
  }

  private handleOpen(event: MouseEvent) {
    const template = this.template();

    if (!template) return;

    event.preventDefault();
    event.stopPropagation();

    this.#contextMenuService.open(ContextMenuComponent, template, {
      mode: this.wmMenuMode(),
      event: event,
      anchorElement: this.#element.nativeElement,
      offset: this.wmOffset(),
    });
  }
}
