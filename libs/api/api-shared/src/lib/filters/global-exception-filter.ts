import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;

    // Определяем статус и сообщение ошибки
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : {
          statusCode: status,
          message: 'Internal server error',
          error: 'Internal Server Error',
        };

    // Логируем ошибку для отладки (в production лучше через Logger)
    console.error(
      `[${new Date().toISOString()}] ${request.method} ${request.url}`,
      exception,
    );

    httpAdapter.reply(
      response,
      {
        statusCode: status,
        message:
          typeof message === 'string'
            ? message
            : (message as any).message || 'Something went wrong',
        error: typeof message === 'object' ? (message as any).error : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      status,
    );
  }
}
