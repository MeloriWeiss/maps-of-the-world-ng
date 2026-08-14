import { Routes } from '@angular/router';
import {
  canActivateNonAuth,
  LoginPageComponent,
  RegisterPageComponent,
} from '@wm/web/auth';
import { AuthLayoutComponent } from '@wm/web/layout/auth';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [canActivateNonAuth],
    children: [
      {
        path: 'login',
        component: LoginPageComponent,
        data: {
          seo: {
            title: 'Вход',
            description: 'Вход в аккаунт GameMaster Helper.',
            index: false,
          },
        },
      },
      {
        path: 'register',
        component: RegisterPageComponent,
        data: {
          seo: {
            title: 'Регистрация',
            description: 'Создание аккаунта GameMaster Helper.',
            index: false,
          },
        },
      },
    ],
  },
];
