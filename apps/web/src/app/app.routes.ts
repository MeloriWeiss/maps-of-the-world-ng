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
        data: {
          seo: {
            title: 'Карты и инструменты для настольных ролевых игр',
            description:
              'Создавайте карты для НРИ, публикуйте их и используйте готовые наборы текстур в GameMaster Helper.',
            index: true,
          },
        },
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
            canActivate: [canActivateAuth],
            data: {
              seo: {
                title: 'Профиль пользователя',
                description: 'Профиль пользователя GameMaster Helper.',
                index: false,
              },
            },
          },
          {
            path: 'forum',
            loadChildren: () =>
              import('@wm/web/forum').then((m) => m.forumRoutes),
          },
          {
            path: 'maps',
            loadComponent: () =>
              import('@wm/web/maps').then((m) => m.MapsCatalogPageComponent),
            data: {
              seo: {
                title: 'Карты сообщества',
                description:
                  'Каталог опубликованных карт сообщества для настольных ролевых игр.',
                index: true,
                canonicalPath: '/maps',
              },
            },
          },
          {
            path: 'mods',
            loadChildren: () =>
              import('@wm/web/mods').then((m) => m.modsRoutes),
          },
          {
            path: 'texture-packs',
            loadChildren: () =>
              import('@wm/web/texture-packs').then((m) => m.texturePacksRoutes),
          },
        ],
      },
      {
        path: 'workshop',
        loadComponent: () =>
          import('@wm/web/workshop').then((m) => m.WorkshopPageComponent),
        canActivate: [canActivateAuth],
        data: {
          seo: {
            title: 'Редактор карты',
            description: 'Редактор карт GameMaster Helper.',
            index: false,
          },
        },
      },
    ],
  },

  {
    path: '',
    component: AuthLayoutComponent,
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
    canActivate: [canActivateNonAuth],
  },

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
