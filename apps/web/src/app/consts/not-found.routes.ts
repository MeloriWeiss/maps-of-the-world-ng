import type { BaseRoutes } from '@wm/web/shared';
import { ErrorComponent } from '@wm/web/common-ui';

/** Маршруты страниц, отображаемых при отсутствии подходящего пути. */
export const notFoundRoutes: BaseRoutes = [
  {
    path: '**',
    component: ErrorComponent,
    data: {
      seo: {
        title: 'Страница не найдена',
        description: 'Запрошенная страница не найдена.',
        index: false,
      },
    },
  },
];
