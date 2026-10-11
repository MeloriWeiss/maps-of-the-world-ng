import { Directive, input } from '@angular/core';

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
