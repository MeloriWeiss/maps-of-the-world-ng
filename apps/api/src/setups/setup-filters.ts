import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiLogger, GlobalExceptionFilter } from '@wm/api/api-shared';

export function setupFilters(app: INestApplication) {
  const httpAdapterHost = app.get(HttpAdapterHost);
  const logger = app.get(ApiLogger);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost, logger));
}
