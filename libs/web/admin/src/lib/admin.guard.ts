import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '@wm/shared/users';
import { CurrentAccountStore } from '@wm/web/data-access/profile';

export const canActivateAdmin: CanActivateFn = () => {
  const role = inject(CurrentAccountStore).user()?.role;
  if (role === UserRole.admin || role === UserRole.superAdmin) return true;
  return inject(Router).createUrlTree(['/home']);
};
