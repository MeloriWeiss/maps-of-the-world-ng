import { Routes } from '@angular/router';
import { ModsListComponent } from '../feature-mods-list/mods-list/mods-list.component';
import { ModsPageComponent } from '../feature-mods-page/mods-page/mods-page.component';

export const modsRoutes: Routes = [
  {
    path: '',
    component: ModsListComponent,
  },
  {
    path: ':id',
    component: ModsPageComponent,
  },
];
