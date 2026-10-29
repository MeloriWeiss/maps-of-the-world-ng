import type { BaseRoutes } from '@wm/web/shared';
import { HomePageComponent } from '../home-page/home-page.component';

/** Маршруты главной страницы и её дочерних разделов. */
export const homeRoutes: BaseRoutes = [
  {
    path: '',
    component: HomePageComponent,
    data: {
      seo: {
        title: 'Онлайн-редактор карт для НРИ',
        description:
          'Создавайте атмосферные карты для настольных ролевых игр в браузере, используйте текстур-паки и делитесь мирами.',
        index: true,
        canonicalPath: '/home',
      },
    },
  },
];
