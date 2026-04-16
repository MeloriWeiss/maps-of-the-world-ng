import { AbstractControl, ValidatorFn } from '@angular/forms';
import { authConfig } from '@wm/shared/auth';

const passwordConfig = authConfig.password;

export const validatePassword: ValidatorFn = (control: AbstractControl) => {
  if (!control.value) {
    return {
      [passwordConfig.errorName]: { message: passwordConfig.required.message },
    };
  }
  if (control.value.length < passwordConfig.minLength.value) {
    return {
      [passwordConfig.errorName]: { message: passwordConfig.minLength.message },
    };
  }
  if (!passwordConfig.hasUppercase.pattern.test(control.value)) {
    return {
      [passwordConfig.errorName]: {
        message: passwordConfig.hasUppercase.message,
      },
    };
  }
  if (control.value.length > passwordConfig.maxLength.value) {
    return {
      [passwordConfig.errorName]: { message: passwordConfig.maxLength.message },
    };
  }
  return null;
};
