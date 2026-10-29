import type { BaseRoutes } from '@wm/web/shared';
import { AdminPageComponent } from '../admin-page/admin-page.component';
import { canActivateAdmin } from '../admin.guard';
import { provideCharts } from 'ng2-charts';
import {
  ArcElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

/** Маршруты административного раздела. */
export const adminRoutes: BaseRoutes = [
  {
    path: '',
    component: AdminPageComponent,
    canActivate: [canActivateAdmin],
    data: {
      seo: {
        title: 'Управление сайтом',
        description: 'Служебный раздел управления сайтом.',
        index: false,
      },
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        providers: [
          provideCharts({
            registerables: [
              DoughnutController,
              ArcElement,
              LineController,
              LineElement,
              PointElement,
              CategoryScale,
              LinearScale,
              Tooltip,
              Legend,
            ],
          }),
        ],
        loadComponent: () =>
          import('../admin-page/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../admin-page/users/users.component').then(
            (module) => module.UsersComponent,
          ),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('../admin-page/content/content.component').then(
            (module) => module.ContentComponent,
          ),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('../admin-page/audit/audit.component').then(
            (module) => module.AuditComponent,
          ),
      },
    ],
  },
];
