import { Routes } from '@angular/router';
import { ErrorComponent } from '@wm/web/common-ui';
import { authRoutes } from './routing/auth.routes';
import { publicRoutes } from './routing/public.routes';

const adminRoutes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('@wm/web/admin').then((module) => module.adminRoutes),
  },
];

const notFoundRoutes: Routes = [
  {
    path: '**',
    component: ErrorComponent,
    data: {
      seo: {
        title: 'Страница не найдена',
        description: 'Запрошенная страница не найдена.',
        index: false,
      },
    },
  },
];

export const routes: Routes = [
  ...adminRoutes,
  ...publicRoutes,
  ...authRoutes,
  ...notFoundRoutes,
];
