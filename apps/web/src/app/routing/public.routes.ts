import { Routes } from '@angular/router';
import { canActivateAuth } from '@wm/web/auth';
import { BaseLayoutComponent } from '@wm/web/layout/base';

export const publicRoutes: Routes = [
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
          import('@wm/web/home').then((module) => module.HomeRoutes),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('@wm/web/home').then((module) => module.AboutPageComponent),
        data: {
          seo: {
            title: 'О проекте',
            description:
              'История, миссия и команда GameMaster Helper — платформы для создания карт и миров настольных ролевых игр.',
            index: true,
            canonicalPath: '/about',
          },
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('@wm/web/profile').then(
            (module) => module.AccountSettingsComponent,
          ),
        canActivate: [canActivateAuth],
        data: {
          seo: {
            title: 'Настройки аккаунта',
            description:
              'Смена пароля и управление сессиями GameMaster Helper.',
            index: false,
            canonicalPath: '/settings',
          },
        },
      },
      {
        path: 'profile/:id',
        loadChildren: () =>
          import('@wm/web/profile').then((module) => module.profileRoutes),
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
          import('@wm/web/forum').then((module) => module.forumRoutes),
      },
      {
        path: 'maps',
        loadComponent: () =>
          import('@wm/web/maps').then(
            (module) => module.MapsCatalogPageComponent,
          ),
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
          import('@wm/web/mods').then((module) => module.modsRoutes),
      },
      {
        path: 'texture-packs',
        loadChildren: () =>
          import('@wm/web/texture-packs').then(
            (module) => module.texturePacksRoutes,
          ),
      },
    ],
  },
  {
    path: 'workshop',
    loadComponent: () =>
      import('@wm/web/workshop').then((module) => module.WorkshopPageComponent),
    canActivate: [canActivateAuth],
    data: {
      seo: {
        title: 'Редактор карты',
        description: 'Редактор карт GameMaster Helper.',
        index: false,
      },
    },
  },
];
