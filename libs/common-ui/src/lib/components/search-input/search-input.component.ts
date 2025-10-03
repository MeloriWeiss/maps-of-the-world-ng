import { ChangeDetectionStrategy, Component, effect, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'wm-search-input',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => SearchInputComponent)
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInputComponent implements ControlValueAccessor {
  type = input('text');
  placeholder = input('Поиск');

  disabled = signal(false);

  innerFormControl = new FormControl('');

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.innerFormControl.disable();
        return;
      }
      this.innerFormControl.enable();
    });
  }

  writeValue(value: string | null): void {
    this.innerFormControl.setValue(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onChange(value: string | null) {
  }

  onTouched() {
  }
}
