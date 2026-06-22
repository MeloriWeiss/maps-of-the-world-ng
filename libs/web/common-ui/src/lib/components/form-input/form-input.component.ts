import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SvgComponent } from '../svg/svg.component';

@Component({
  selector: 'wm-form-input',
  imports: [ReactiveFormsModule, SvgComponent],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => FormInputComponent),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormInputComponent implements ControlValueAccessor {
  type = input('text');
  placeholder = input('Введите');

  showPasswordToggle = input(false);

  disabled = signal(false);
  passwordVisible = signal(false);
  resolvedType = computed(() => {
    if (this.showPasswordToggle() && this.type() === 'password') {
      return this.passwordVisible() ? 'text' : 'password';
    }

    return this.type();
  });
  passwordToggleIcon = computed(() =>
    this.passwordVisible() ? 'eye-off' : 'eye',
  );
  passwordToggleLabel = computed(() =>
    this.passwordVisible() ? 'Hide password' : 'Show password',
  );

  innerFormControl = new FormControl('');

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.innerFormControl.disable();
        return;
      }
      this.innerFormControl.enable();
    });

    this.innerFormControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.onChange(value);
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

  togglePasswordVisibility() {
    this.passwordVisible.update((value) => !value);
  }

  onChange(value: string | null) {}

  onTouched() {}
}
