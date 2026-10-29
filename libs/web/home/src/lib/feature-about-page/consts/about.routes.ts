import type { BaseRoutes } from '@wm/web/shared';
import { AboutPageComponent } from '../about-page/about-page.component';

/** Маршруты страницы с описанием проекта. */
export const aboutRoutes: BaseRoutes = [
  {
    path: '',
    component: AboutPageComponent,
    data: {
      seo: {
        title: 'О проекте',
        description:
          'История, миссия и команда GameMaster Helper — платформы для создания карт и миров настольных ролевых игр.',
        index: true,
        canonicalPath: '/about',
      },
    },
  },
];
