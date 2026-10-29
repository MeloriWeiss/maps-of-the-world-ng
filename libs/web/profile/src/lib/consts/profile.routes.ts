import type { BaseRoutes } from '@wm/web/shared';
import {
  ProfilePageMapsComponent,
  ProfilePageFavouriteComponent,
  ProfilePageLayoutComponent,
  ProfilePageTexturePacksComponent,
  ProfilePageEditComponent,
} from '../feature-profile-page';

/** Маршруты страниц профиля пользователя. */
export const profileRoutes: BaseRoutes = [
  {
    path: '',
    component: ProfilePageLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'maps',
        pathMatch: 'full',
      },
      {
        path: 'edit',
        component: ProfilePageEditComponent,
      },
      {
        path: 'maps',
        component: ProfilePageMapsComponent,
      },
      {
        path: 'texture-packs',
        component: ProfilePageTexturePacksComponent,
      },
      {
        path: 'favourite',
        component: ProfilePageFavouriteComponent,
      },
    ],
  },
];
