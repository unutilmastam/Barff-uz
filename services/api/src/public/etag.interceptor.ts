import { createHash } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { type Observable, map } from 'rxjs';

/** Ommaviy javoblar brauzer va CDN'da shuncha vaqt saqlanadi. */
const PUBLIC_MAX_AGE = 60;
/**
 * Yangilanayotgan paytda eski javobni berish muddati.
 *
 * CDN eski nusxani qaytarib turib, orqa fonda yangisini oladi —
 * foydalanuvchi kutmaydi (CLAUDE.md §26).
 */
const STALE_WHILE_REVALIDATE = 300;

/**
 * ETag va `Cache-Control` sarlavhalari.
 *
 * ETag javob tanasining hash'i. Mijoz `If-None-Match` bilan qaytib
 * kelsa va hash o'zgarmagan bo'lsa — `304` qaytariladi va TANA umuman
 * yuborilmaydi. Katta mahsulot ro'yxatlari uchun bu sezilarli trafik
 * tejaydi.
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (body === undefined || body === null) return body;

        const etag = `W/"${createHash('sha1').update(JSON.stringify(body)).digest('base64url')}"`;

        response.setHeader('ETag', etag);
        response.setHeader(
          'Cache-Control',
          `public, max-age=${PUBLIC_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        );

        if (request.headers['if-none-match'] === etag) {
          response.status(304);
          // `304` javobida tana bo'lmasligi SHART (RFC 9110).
          return undefined;
        }

        return body;
      }),
    );
  }
}
