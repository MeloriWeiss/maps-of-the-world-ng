/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { setupApp } from './setups';
import { ApiLogger } from '@wm/api/api-shared';

async function bootstrap() {
  const apiLogger = new ApiLogger();
  const app = await NestFactory.create(AppModule, {
    logger: apiLogger,
  });
  app.use(json({ limit: '10mb' }));
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

bootstrap().catch((exception: unknown) => {
  const logger = new ApiLogger();
  const error = exception instanceof Error ? exception : undefined;

  logger.error(
    'Application startup failed',
    {
      exception: error
        ? { name: error.name, message: error.message }
        : { type: typeof exception },
    },
    error?.stack,
    'Bootstrap',
  );
  process.exitCode = 1;
});
