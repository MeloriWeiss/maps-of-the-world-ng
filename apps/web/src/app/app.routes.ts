import { Routes } from '@angular/router';
import {
  canActivateAuth,
  canActivateNonAuth,
  LoginPageComponent,
  RegisterPageComponent,
} from '@wm/web/auth';
import { AuthLayoutComponent } from '@wm/web/layout/auth';
import { BaseLayoutComponent } from '@wm/web/layout/base';
import { ErrorComponent } from '@wm/web/common-ui';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: BaseLayoutComponent,
        children: [
          {
            path: '',
            redirectTo: 'home',
            pathMatch: 'full',
          },
          {
            path: 'home',
            loadChildren: () =>
              import('@wm/web/home').then((m) => m.HomeRoutes),
          },
          {
            path: 'profile/:id',
            loadChildren: () =>
              import('@wm/web/profile').then((m) => m.profileRoutes),
          },
          {
            path: 'forum',
            loadChildren: () =>
              import('@wm/web/forum').then((m) => m.forumRoutes),
          },
          {
            path: 'mods',
            loadChildren: () =>
              import('@wm/web/mods').then((m) => m.modsRoutes),
          },
        ],
      },
      {
        path: 'workshop',
        loadComponent: () =>
          import('@wm/web/workshop').then((m) => m.WorkshopPageComponent),
      },
    ],
    canActivate: [canActivateAuth],
    title: 'Maps of the world',
  },

  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginPageComponent,
        title: 'Maps of the world: Вход',
      },
      {
        path: 'register',
        component: RegisterPageComponent,
        title: 'Maps of the world: Регистрация',
      },
    ],
    canActivate: [canActivateNonAuth],
  },

  {
    path: '**',
    component: ErrorComponent,
  },
];
