import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Показывает пояснение и необязательное действие для пустого раздела. */
@Component({
  selector: 'wm-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
