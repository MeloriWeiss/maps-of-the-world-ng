import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@wm/web/data-access/auth';

export const canActivateAuth: CanActivateFn = () => {
  const isAuth = inject(AuthService).isAuthorized$.value;

  if (isAuth) return true;

  return inject(Router).createUrlTree(['login']);
};
