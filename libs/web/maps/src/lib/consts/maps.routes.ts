import type { BaseRoutes } from '@wm/web/shared';
import { MapsCatalogPageComponent } from '../feature-maps-catalog-page/maps-catalog-page/maps-catalog-page.component';

/** Маршруты каталога карт. */
export const mapsRoutes: BaseRoutes = [
  {
    path: '',
    component: MapsCatalogPageComponent,
    data: {
      seo: {
        title: 'Карты сообщества',
        description:
          'Каталог опубликованных карт сообщества для настольных ролевых игр.',
        index: true,
        canonicalPath: '/maps',
      },
    },
  },
];
