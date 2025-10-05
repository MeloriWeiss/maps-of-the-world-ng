import { Routes } from '@angular/router';
import {
  canActivateAuth,
  LoginPageComponent,
  SignupPageComponent,
} from '@wm/auth';
import { AuthLayoutComponent } from '@wm/layout/auth';
import { BaseLayoutComponent } from '@wm/layout/base';
import { ErrorComponent } from '@wm/common-ui';
import { ForumPageComponent } from '@wm/forum';
import { ProfilePageComponent } from '@wm/profile';

export const routes: Routes = [
  {
    path: '',
    component: BaseLayoutComponent,
    children: [
      {
        path: 'profile/me',
        component: ProfilePageComponent,
        pathMatch: 'full',
      },
      {
        path: 'profile/:id',
        component: ErrorComponent,
      },
      {
        path: 'forum',
        component: ForumPageComponent,
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
        path: 'signup',
        component: SignupPageComponent,
        title: 'Maps of the world: Регистрация',
      },
    ],
  },

  {
    path: '**',
    component: ErrorComponent,
  },
];
