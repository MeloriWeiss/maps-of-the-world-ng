import { Routes } from '@angular/router';
import {
  ProfilePageMapsComponent,
  ProfilePageFavouriteComponent,
  ProfilePageLayoutComponent,
  ProfilePageTexturePacksComponent,
  ProfilePageEditComponent,
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
