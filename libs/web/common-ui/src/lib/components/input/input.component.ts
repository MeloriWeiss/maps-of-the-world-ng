import {
  ChangeDetectionStrategy,
  Component,
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

/** Универсальное поле ввода с настройками отображения и состояния. */
@Component({
  selector: 'wm-input',
  imports: [ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => InputComponent),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements ControlValueAccessor {
  type = input('text');
  placeholder = input('');
  ariaLabel = input<string | null>(null);
  autocomplete = input<string | null>(null);
  disabled = signal(false);
  readonly innerFormControl = new FormControl('');

  constructor() {
    effect(() => {
      if (this.disabled()) this.innerFormControl.disable();
      else this.innerFormControl.enable();
    });
    this.innerFormControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.onChange(value));
  }

  writeValue(value: string | null): void {
    this.innerFormControl.setValue(value ?? '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onChange: (value: string | null) => void = () => undefined;
  onTouched: VoidFunction = () => undefined;
}
