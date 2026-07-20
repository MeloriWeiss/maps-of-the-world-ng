import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiLogger } from '../loggers';

interface HttpErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

@Catch() // ловим вообще всё
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: ApiLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.#buildErrorBody(exception, status);

    const payload: ErrorResponse = {
      statusCode: status,
      message: body.message,
      error: body.error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.#logException(request, exception, status, payload);

    httpAdapter.reply(response, payload, status);
  }

  #buildErrorBody(exception: unknown, status: number): HttpErrorBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode: status,
          message: response,
        };
      }

      const typed = response as Partial<HttpErrorBody>;

      return {
        statusCode: status,
        message: typed.message ?? 'HTTP error occurred',
        error: typed.error,
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: status,
        message: exception.message,
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode: status,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  #logException(
    request: Request,
    exception: unknown,
    status: number,
    payload: ErrorResponse,
  ): void {
    const context = `GlobalExceptionFilter ${request.method} ${request.url}`;

    if (status >= 500 || !(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : undefined;

      this.logger.error(
        `Unhandled exception (${status})`,
        {
          payload,
          exception:
            exception instanceof Error
              ? { name: exception.name, message: exception.message }
              : { type: typeof exception },
        },
        stack,
        context,
      );
    } else {
      this.logger.warn(
        `HTTP exception (${status})`,
        {
          payload,
        },
        context,
      );
    }
  }
}
