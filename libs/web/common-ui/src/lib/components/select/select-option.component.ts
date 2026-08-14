import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { SELECT_HOST } from './select.token';

@Component({
  selector: 'wm-option',
  template: '<ng-content />',
  host: {
    role: 'option',
    '[attr.aria-selected]': 'selected()',
    '[class.wm-option--selected]': 'selected()',
    '(click)': 'choose()',
  },
  styleUrl: './select-option.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectOptionComponent {
  readonly #select = inject(SELECT_HOST);

  value = input.required<string>();
  label = input.required<string>();
  readonly selected = computed(() => this.#select.isSelected(this.value()));

  choose() {
    this.#select.select(this.value());
  }
}
