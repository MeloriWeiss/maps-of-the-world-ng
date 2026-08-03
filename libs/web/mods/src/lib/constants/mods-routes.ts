import { Routes } from '@angular/router';
import { ModsListComponent } from '../feature-mods-list/mods-list/mods-list.component';
import { ModsPageComponent } from '../feature-mods-page/mods-page/mods-page.component';

export const modsRoutes: Routes = [
  {
    path: '',
    component: ModsListComponent,
    data: {
      seo: {
        title: 'Моды и наборы текстур',
        description:
          'Наборы текстур и дополнения сообщества для создания карт настольных ролевых игр.',
        index: true,
        canonicalPath: '/mods',
      },
    },
  },
  {
    path: ':id',
    component: ModsPageComponent,
    data: {
      seo: {
        title: 'Набор текстур',
        description: 'Описание и материалы набора текстур для карт НРИ.',
        index: true,
        type: 'article',
      },
    },
  },
];
