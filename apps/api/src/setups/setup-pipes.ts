import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Регистрирует общие конвейеры проверки входящих запросов. */
export const setupPipes = (app: INestApplication) => {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
};
