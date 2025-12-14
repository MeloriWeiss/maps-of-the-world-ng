import { Routes } from '@angular/router';
import {
  canActivateAuth,
  canActivateNonAuth,
  LoginPageComponent,
  SignupPageComponent,
} from '@wm/auth';
import { AuthLayoutComponent } from '@wm/layout/auth';
import { BaseLayoutComponent } from '@wm/layout/base';
import { ErrorComponent } from '@wm/common-ui';

export const routes: Routes = [
  {
    path: '',
    component: BaseLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'profile/me',
        pathMatch: 'full',
      },
      {
        path: 'profile/:id',
        loadChildren: () => import('@wm/profile').then((m) => m.profileRoutes),
      },
      {
        path: 'forum',
        loadChildren: () => import('@wm/forum').then((m) => m.forumRoutes),
      },
      {
        path: 'mods',
        loadChildren: () => import('@wm/mods').then((m) => m.modsRoutes),
      },
      // {
      //   path: 'workshop',
      //   loadComponent: () => import('@wm/workshop').then((m) => m.WorkshopPageComponent)
      // },
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
        path: 'signup',
        component: SignupPageComponent,
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
