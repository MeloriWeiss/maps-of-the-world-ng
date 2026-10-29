import { INestApplication } from '@nestjs/common';
import { setupFilters } from './setup-filters';
import { setupSwagger } from './setup-swagger';
import { setupPipes } from './setup-pipes';

/** Подключает общие настройки HTTP-приложения NestJS. */
export function setupApp(app: INestApplication) {
  setupFilters(app);
  setupSwagger(app);
  setupPipes(app);
}
