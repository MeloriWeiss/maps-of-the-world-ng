import type { BaseRoutes } from '@wm/web/shared';
import { LoginPageComponent } from '../feature-login/login-page/login-page.component';
import { RegisterPageComponent } from '../feature-register/register-page/register-page.component';

/** Маршруты входа, регистрации и восстановления доступа. */
export const authPageRoutes: BaseRoutes = [
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
];
