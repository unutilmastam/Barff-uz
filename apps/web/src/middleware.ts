import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALES, isLocale } from '@/i18n/config';

/**
 * Til marshrutlash.
 *
 * Til segmentisiz kelgan so'rov mos tilga yo'naltiriladi. Til tanlash
 * tartibi: yo'ldagi segment -> avval tanlangan til (cookie) ->
 * brauzer sozlamasi -> standart (`uz`).
 */
const LOCALE_COOKIE = 'barff_locale';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const firstSegment = pathname.split('/')[1] ?? '';

  // Til allaqachon yo'lda — tanlovni eslab qo'yamiz va aralashmaymiz.
  if (isLocale(firstSegment)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return response;
  }

  const locale = resolveLocale(request);

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

  // 307: metod va tana saqlanadi. 308 (doimiy) ishlatilmaydi — til tanlovi
  // o'zgarishi mumkin, brauzer esa doimiy yo'naltirishni keshlab qo'yardi.
  return NextResponse.redirect(url, 307);
}

function resolveLocale(request: NextRequest): string {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie !== undefined && isLocale(fromCookie)) return fromCookie;

  const header = request.headers.get('accept-language');
  if (header !== null) {
    for (const part of header.split(',')) {
      // `ru-RU;q=0.9` -> `ru`
      const code = part.split(';')[0]?.trim().split('-')[0]?.toLowerCase();
      if (code !== undefined && isLocale(code)) return code;
    }
  }

  return DEFAULT_LOCALE;
}

export const config = {
  /**
   * Statik fayllar va API yo'llari chetlab o'tiladi — ularga til segmenti
   * qo'shilsa, rasm va shriftlar 404 bo'lib qolardi.
   */
  matcher: ['/((?!_next|api|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)'],
};

export { LOCALES };
