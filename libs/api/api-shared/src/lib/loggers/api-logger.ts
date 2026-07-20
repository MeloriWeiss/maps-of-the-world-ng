import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

interface LogMeta {
  [key: string]: unknown;
}

interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  meta?: LogMeta;
}

@Injectable()
export class ApiLogger implements LoggerService {
  log(message: string, meta?: LogMeta, context?: string) {
    this.#write('log', message, meta, context);
  }

  error(message: string, meta?: LogMeta, trace?: string, context?: string) {
    this.#write('error', message, { ...meta, trace }, context);
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

  #write(level: LogLevel, message: string, meta?: LogMeta, context?: string) {
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
