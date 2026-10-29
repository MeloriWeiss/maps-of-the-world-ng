import { Directive, input } from '@angular/core';

/** Добавляет элементу подсказку и управляет её отображением. */
@Directive({
  selector: '[wmTooltip]',
  standalone: true,
  host: {
    class: 'wm-tooltip',
    '[attr.data-wm-tooltip]': 'wmTooltip()',
    '[attr.data-wm-tooltip-position]': 'wmTooltipPosition()',
  },
})
export class TooltipDirective {
  readonly wmTooltip = input.required<string>();
  readonly wmTooltipPosition = input<'left' | 'right' | 'top'>('top');
}
