import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@wm/web/data-access/auth';

/** Перенаправляет авторизованного пользователя со страниц входа и регистрации. */
export const canActivateNonAuth: CanActivateFn = () => {
  return !inject(AuthService).isAuthorized$.value;
};
