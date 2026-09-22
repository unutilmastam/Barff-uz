import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Request id biriktirilgan so'rov.
 *
 * Global `declare module` o'rniga alohida interfeys: augmentatsiya butun
 * loyiha bo'ylab Express tipini o'zgartiradi va tashqi paketlarga ham ta'sir
 * qiladi, bu yerda esa faqat shu qatlamga kerak.
 */
export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Tashqaridan kelgan `x-request-id` faqat u xavfsiz ko'rinishda bo'lsa
 * qabul qilinadi. Aks holda mijoz log fayliga ixtiyoriy matn (yangi qator,
 * ANSI kodlari) kiritib, log'ni buzishi mumkin edi.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{8,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const candidate = Array.isArray(incoming) ? incoming[0] : incoming;

    req.requestId = candidate !== undefined && SAFE_ID.test(candidate) ? candidate : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.requestId);

    next();
  }
}
