import { Routes } from '@angular/router';
import { TexturePackCatalogPageComponent } from '../texture-pack-catalog-page.component';
import { TexturePackDetailsPageComponent } from '../texture-pack-details-page.component';
import { TexturePackEditPageComponent } from '../texture-pack-edit-page.component';
import { canActivateAuth } from '@wm/web/auth';

export const texturePacksRoutes: Routes = [
  {
    path: ':id/edit',
    component: TexturePackEditPageComponent,
    canActivate: [canActivateAuth],
    data: {
      seo: {
        title: 'Редактирование текстур-пака',
        description: 'Редактирование текстур-пака GameMaster Helper.',
        index: false,
      },
    },
  },
  {
    path: ':id',
    component: TexturePackDetailsPageComponent,
    data: {
      seo: {
        title: 'Текстур-пак для карт НРИ',
        description:
          'Опубликованный набор текстур сообщества для создания карт настольных ролевых игр.',
        index: true,
        type: 'article',
      },
    },
  },
  {
    path: '',
    component: TexturePackCatalogPageComponent,
    data: {
      seo: {
        title: 'Текстур-паки для карт НРИ',
        description:
          'Каталог опубликованных наборов текстур для создания карт настольных ролевых игр.',
        index: true,
        canonicalPath: '/texture-packs',
      },
    },
  },
];
