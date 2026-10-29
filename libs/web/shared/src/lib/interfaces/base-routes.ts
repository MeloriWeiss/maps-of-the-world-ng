import type { Route } from '@angular/router';
import type { SeoMetadata } from '../seo/seo.types';

/** Декларативные данные маршрута, используемые общими сервисами приложения. */
/** Данные маршрута, которые читают общие сервисы навигации и SEO. */
export interface BaseRouteData {
  seo?: SeoMetadata;
  preserveScrollOnQueryChange?: boolean;
}

/** Маршрут Angular с проверяемыми SEO-данными и типизированными дочерними маршрутами. */
export interface BaseRoute extends Omit<Route, 'data' | 'children'> {
  data?: BaseRouteData;
  children?: BaseRoutes;
}

/** Конфигурация маршрутов проекта; SEO-контракт применяется на каждом уровне children. */
export type BaseRoutes = BaseRoute[];
