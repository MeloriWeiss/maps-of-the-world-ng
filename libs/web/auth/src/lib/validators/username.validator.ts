import { AbstractControl, ValidatorFn } from '@angular/forms';
import { authConfig } from '@wm/shared/auth';

const usernameConfig = authConfig.username;

export const validateUsername: ValidatorFn = (control: AbstractControl) => {
  if (!control.value) {
    return {
      [usernameConfig.errorName]: { message: usernameConfig.required.message },
    };
  }
  if (control.value.length < usernameConfig.minLength.value) {
    return {
      [usernameConfig.errorName]: { message: usernameConfig.minLength.message },
    };
  }
  if (control.value.length > usernameConfig.maxLength.value) {
    return {
      [usernameConfig.errorName]: { message: usernameConfig.maxLength.message },
    };
  }
  return null;
};
