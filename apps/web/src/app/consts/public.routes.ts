import type { BaseRoutes } from '@wm/web/shared';
import { canActivateAuth } from '@wm/web/auth';
import { BaseLayoutComponent } from '@wm/web/layout/base';

/** Маршруты публичных разделов приложения. */
export const publicRoutes: BaseRoutes = [
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
          import('@wm/web/home').then((module) => module.homeRoutes),
      },
      {
        path: 'about',
        loadChildren: () =>
          import('@wm/web/home').then((module) => module.aboutRoutes),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@wm/web/profile').then((module) => module.settingsRoutes),
        canActivate: [canActivateAuth],
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
        loadChildren: () =>
          import('@wm/web/maps').then((module) => module.mapsRoutes),
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
    loadChildren: () =>
      import('@wm/web/workshop').then((module) => module.workshopRoutes),
    canActivate: [canActivateAuth],
  },
];
