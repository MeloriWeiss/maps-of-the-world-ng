import {ChangeDetectionStrategy, Component, effect, forwardRef, input, signal} from '@angular/core';
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'wm-form-input',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => FormInputComponent)
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormInputComponent implements ControlValueAccessor {
  type = input('text');
  placeholder = input('Введите');

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
