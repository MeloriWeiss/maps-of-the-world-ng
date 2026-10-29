import type { BaseRoutes } from '@wm/web/shared';
import { adminRoutes } from './admin.routes';
import { notFoundRoutes } from './not-found.routes';
import { authRoutes } from './auth.routes';
import { publicRoutes } from './public.routes';

/** Корневая конфигурация маршрутов приложения. */
export const routes: BaseRoutes = [
  ...adminRoutes,
  ...publicRoutes,
  ...authRoutes,
  ...notFoundRoutes,
];
