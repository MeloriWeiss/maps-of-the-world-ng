import type { BaseRoutes } from '@wm/web/shared';
import { WorkshopPageComponent } from '../feature-workshop-page/workshop-page/workshop-page.component';

/** Маршруты редактора Workshop. */
export const workshopRoutes: BaseRoutes = [
  {
    path: '',
    component: WorkshopPageComponent,
    data: {
      seo: {
        title: 'Редактор карты',
        description: 'Редактор карт GameMaster Helper.',
        index: false,
      },
    },
  },
];
