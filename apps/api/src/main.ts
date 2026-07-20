/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { setupApp } from './setups';
import { ApiLogger } from '@wm/api/api-shared';

async function bootstrap() {
  const apiLogger = new ApiLogger();
  const app = await NestFactory.create(AppModule, {
    logger: apiLogger,
  });
  app.use(cookieParser());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env['MAIN_API_PORT'] || 3000;
  setupApp(app);
  await app.listen(port);
  apiLogger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap().then();
