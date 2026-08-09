import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

interface LogMeta {
  [key: string]: unknown;
}

interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: unknown;
  meta?: LogMeta;
}

@Injectable()
export class ApiLogger implements LoggerService {
  log(message: string, meta?: LogMeta, context?: string) {
    this.#write('log', message, meta, context);
  }

  error(
    message: unknown,
    metaOrTrace?: LogMeta | string,
    traceOrContext?: string,
    context?: string,
  ) {
    const isNestLoggerCall = typeof metaOrTrace === 'string';
    const trace = isNestLoggerCall ? metaOrTrace : traceOrContext;
    const resolvedContext = isNestLoggerCall ? traceOrContext : context;
    const meta = isNestLoggerCall ? undefined : metaOrTrace;
    const error = message instanceof Error ? message : undefined;

    this.#write(
      'error',
      error?.message ?? message,
      {
        ...meta,
        ...(error && {
          exception: { name: error.name, message: error.message },
        }),
        trace: trace ?? error?.stack,
      },
      resolvedContext,
    );
  }

  warn(message: string, meta?: LogMeta, context?: string) {
    this.#write('warn', message, meta, context);
  }

  debug(message: string, meta?: LogMeta, context?: string) {
    this.#write('debug', message, meta, context);
  }

  verbose(message: string, meta?: LogMeta, context?: string) {
    this.#write('verbose', message, meta, context);
  }

  #write(level: LogLevel, message: unknown, meta?: LogMeta, context?: string) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      meta,
    };

    const serialized = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(serialized + '\n');
    } else {
      process.stdout.write(serialized + '\n');
    }
  }
}
