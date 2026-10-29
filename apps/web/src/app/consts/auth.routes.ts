import type { BaseRoutes } from '@wm/web/shared';
import { canActivateNonAuth, authPageRoutes } from '@wm/web/auth';
import { AuthLayoutComponent } from '@wm/web/layout/auth';

/** Маршруты авторизации и вложенных страниц аккаунта. */
export const authRoutes: BaseRoutes = [
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [canActivateNonAuth],
    children: authPageRoutes,
  },
];
