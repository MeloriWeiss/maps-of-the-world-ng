import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ClickOutsideDirective } from '../../directives';
import { SelectOptionComponent } from './select-option.component';
import { SELECT_HOST, SelectHost } from './select.token';

let selectId = 0;

@Component({
  selector: 'wm-select',
  imports: [ClickOutsideDirective],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: SELECT_HOST,
      useExisting: forwardRef(() => SelectComponent),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent implements SelectHost {
  readonly optionsId = `wm-select-options-${selectId++}`;
  readonly options = contentChildren(SelectOptionComponent);

  value = input<string | null>(null);
  placeholder = input('Выберите значение');
  ariaLabel = input('Выбрать значение');
  disabled = input(false);
  valueChange = output<string>();
  readonly isOpen = signal(false);
  readonly selectedLabel = computed(
    () =>
      this.options()
        .find((option) => option.value() === this.value())
        ?.label() ?? this.placeholder(),
  );

  isSelected(value: string) {
    return this.value() === value;
  }

  toggle() {
    if (this.disabled()) return;
    this.isOpen.update((isOpen) => !isOpen);
  }

  close() {
    this.isOpen.set(false);
  }

  select(value: string) {
    this.valueChange.emit(value);
    this.close();
  }
}
