import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@wm/data-access/auth';

export const canActivateNonAuth: CanActivateFn = () => {
  return !inject(AuthService).isAuthorized;
};
