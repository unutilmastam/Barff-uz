import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';
import { type ApiErrorBody } from '../dto/api-error';
import { type RequestWithId } from '../middleware/request-id.middleware';

/**
 * Bitta xato shakli — butun API bo'ylab (CLAUDE.md §11).
 *
 * Kutilmagan xatolarning ichki tafsilotlari mijozga YUBORILMAYDI: faqat
 * requestId beriladi, batafsili logda qoladi. Aks holda stack trace orqali
 * ichki tuzilma tashqariga chiqib ketadi.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithId>();
    const requestId = req.requestId ?? 'unknown';

    const { status, message, code, details } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorBody = { statusCode: status, message, code, requestId };
    if (details !== undefined) body.details = details;

    res.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    message: string;
    code: string;
    details?: Record<string, string[]>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, message: payload, code: httpCode(status) };
      }

      const obj = payload as Record<string, unknown>;
      const rawMessage = obj['message'];
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('; ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : exception.message;

      const result: {
        status: number;
        message: string;
        code: string;
        details?: Record<string, string[]>;
      } = {
        status,
        message,
        code: typeof obj['code'] === 'string' ? obj['code'] : httpCode(status),
      };
      if (isFieldErrors(obj['details'])) result.details = obj['details'];
      return result;
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ichki server xatosi',
      code: 'INTERNAL_SERVER_ERROR',
    };
  }
}

/** `details` faqat `{ maydon: ["xabar"] }` ko'rinishida tashqariga chiqadi. */
function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (v) => Array.isArray(v) && v.every((item) => typeof item === 'string'),
    )
  );
}

/** `404` -> `NOT_FOUND`. Mijoz matnga emas, kodga tayanadi. */
function httpCode(status: number): string {
  return HttpStatus[status] !== undefined ? String(HttpStatus[status]) : `HTTP_${status}`;
}
