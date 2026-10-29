import type { BaseRoutes } from '@wm/web/shared';

/** Маршруты административного раздела. */
export const adminRoutes: BaseRoutes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('@wm/web/admin').then((module) => module.adminRoutes),
  },
];
