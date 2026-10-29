import type { BaseRoutes } from '@wm/web/shared';
import { TexturePackCatalogPageComponent } from '../feature-texture-pack-catalog-page/texture-pack-catalog-page/texture-pack-catalog-page.component';
import { TexturePackDetailsPageComponent } from '../feature-texture-pack-details-page/texture-pack-details-page/texture-pack-details-page.component';
import { TexturePackEditPageComponent } from '../feature-texture-pack-edit-page/texture-pack-edit-page/texture-pack-edit-page.component';
import { canActivateAuth } from '@wm/web/auth';

/** Маршруты каталога, страниц и редактора наборов текстур. */
export const texturePacksRoutes: BaseRoutes = [
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
