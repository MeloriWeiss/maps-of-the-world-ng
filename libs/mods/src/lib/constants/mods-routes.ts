import { Routes } from '@angular/router';
import { ModsListComponent } from '../feature-mods-list/index';
import { ModsPageComponent } from '../feature-mods-page/index';

export const modsRoutes: Routes = [
  {
    path: '',
    component: ModsListComponent,
  },
  {
    path: ':id',
    component: ModsPageComponent,
  },
]
