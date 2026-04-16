import { AbstractControl, ValidatorFn } from '@angular/forms';
import { authConfig } from '@wm/shared/auth';

const emailConfig = authConfig.email;

export const validateEmail: ValidatorFn = (control: AbstractControl) => {
  if (!control.value) {
    return {
      [emailConfig.errorName]: { message: emailConfig.required.message },
    };
  }
  if (!authConfig.email.correct.pattern.test(control.value)) {
    return {
      [emailConfig.errorName]: { message: emailConfig.correct.message },
    };
  }
  if (control.value.length > emailConfig.maxLength.value) {
    return {
      [emailConfig.errorName]: { message: emailConfig.maxLength.message },
    };
  }
  return null;
};
