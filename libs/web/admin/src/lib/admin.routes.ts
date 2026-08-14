import { Routes } from '@angular/router';
import { AdminPageComponent } from './admin-page.component';
import { canActivateAdmin } from './admin.guard';
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

export const adminRoutes: Routes = [
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
          import('./dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./content.component').then(
            (module) => module.ContentComponent,
          ),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./audit.component').then((module) => module.AuditComponent),
      },
    ],
  },
];
