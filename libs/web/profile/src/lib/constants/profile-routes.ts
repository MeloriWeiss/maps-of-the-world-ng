import { Routes } from '@angular/router';
import {
  ProfilePageMapsComponent,
  ProfilePageFavouriteComponent,
  ProfilePageLayoutComponent,
  ProfilePageTexturePacksComponent,
} from '../feature-profile-page/index';

export const profileRoutes: Routes = [
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
