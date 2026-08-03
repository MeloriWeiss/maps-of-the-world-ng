import { Routes } from '@angular/router';
import { HomePageComponent } from '../home-page/home-page.component';

export const HomeRoutes: Routes = [
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
