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
            path: 'maps',
            loadComponent: () =>
              import('@wm/web/maps').then((m) => m.MapsCatalogPageComponent),
            title: 'Maps of the world: Карты',
          },
          {
            path: 'mods',
            loadChildren: () =>
              import('@wm/web/mods').then((m) => m.modsRoutes),
          },
          {
            path: 'texture-packs/:id/edit',
            loadComponent: () =>
              import('@wm/web/texture-packs').then(
                (m) => m.TexturePackEditPageComponent,
              ),
            title: 'Maps of the world: Редактирование текстур-пака',
          },
          {
            path: 'texture-packs/:id',
            loadComponent: () =>
              import('@wm/web/texture-packs').then(
                (m) => m.TexturePackDetailsPageComponent,
              ),
            title: 'Maps of the world: Текстур-пак',
          },
          {
            path: 'texture-packs',
            loadComponent: () =>
              import('@wm/web/texture-packs').then(
                (m) => m.TexturePackCatalogPageComponent,
              ),
            title: 'Maps of the world: Текстур-паки',
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
