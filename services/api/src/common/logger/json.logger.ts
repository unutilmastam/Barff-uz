import { type LoggerService, type LogLevel } from '@nestjs/common';
import { redact } from './redact';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Bitta qator = bitta JSON obyekt.
 *
 * CloudWatch, Loki va shunga o'xshash tizimlar JSON qatorlarni to'g'ridan-
 * to'g'ri indekslaydi. Tashqi kutubxona qo'shmaymiz: bizga kerak bo'lgan
 * yagona qo'shimcha xususiyat — maxfiy maydonlarni o'chirish (`redact`),
 * uni baribir o'zimiz yozishimiz kerak edi.
 */
export class JsonLogger implements LoggerService {
  private readonly threshold: number;

  constructor(
    level: Level = 'info',
    private readonly service = 'api',
  ) {
    this.threshold = LEVEL_WEIGHT[level];
  }

  private write(level: Level, message: unknown, context?: unknown, extra?: unknown): void {
    if (LEVEL_WEIGHT[level] < this.threshold) return;

    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      service: this.service,
      msg: typeof message === 'string' ? message : redact(message),
    };

    if (typeof context === 'string') entry['context'] = context;
    if (extra !== undefined) entry['detail'] = redact(extra);

    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  log(message: unknown, context?: unknown): void {
    this.write('info', message, context);
  }

  error(message: unknown, stack?: unknown, context?: unknown): void {
    this.write('error', message, context ?? stack, stack === context ? undefined : { stack });
  }

  warn(message: unknown, context?: unknown): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: unknown): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: unknown): void {
    this.write('debug', message, context);
  }

  setLogLevels?(_levels: LogLevel[]): void {
    // Daraja muhit o'zgaruvchisi orqali boshqariladi.
  }
}
