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
          'Создавайте карты для настольных ролевых игр, публикуйте их и используйте готовые наборы текстур.',
        index: true,
        canonicalPath: '/home',
      },
    },
  },
];
