import { type Locale } from '@barff/types';
import { type Messages } from '@/i18n/dictionary';
import { type RouteKey, routeReady } from './routes';

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Sayt navigatsiyasi — YAGONA manba.
 *
 * Sarlavha, pastki qism va `sitemap.xml` bitta ro'yxatdan oziqlanadi,
 * shuning uchun yangi sahifa qo'shilganda ular bir-biridan ajralib
 * qolmaydi. Qurilmagan sahifa ro'yxatga TUSHMAYDI (`routes.ts`).
 */
const MAIN: { key: RouteKey; path: string; label: (m: Messages) => string }[] = [
  { key: 'company', path: 'company', label: (m) => m.nav.company },
  { key: 'products', path: 'products', label: (m) => m.nav.products },
  { key: 'production', path: 'production', label: (m) => m.nav.production },
  { key: 'quality', path: 'quality', label: (m) => m.nav.quality },
  { key: 'partners', path: 'partners', label: (m) => m.nav.partners },
  { key: 'gallery', path: 'gallery', label: (m) => m.gallery.title },
  { key: 'news', path: 'news', label: (m) => m.nav.news },
  { key: 'contact', path: 'contact', label: (m) => m.nav.contact },
];

const SECONDARY: { key: RouteKey; path: string; label: (m: Messages) => string }[] = [
  { key: 'catalog', path: 'catalog', label: (m) => m.catalog.title },
  { key: 'privacy', path: 'privacy', label: (m) => m.footer.privacy },
  { key: 'terms', path: 'terms', label: (m) => m.footer.terms },
];

function build(source: typeof MAIN, locale: Locale, messages: Messages): NavLink[] {
  return source
    .filter((item) => routeReady(item.key))
    .map((item) => ({ href: `/${locale}/${item.path}`, label: item.label(messages) }));
}

/** Sarlavhadagi asosiy havolalar. */
export function mainNav(locale: Locale, messages: Messages): NavLink[] {
  return build(MAIN, locale, messages);
}

/** Pastki qismdagi qo'shimcha havolalar (katalog, huquqiy hujjatlar). */
export function secondaryNav(locale: Locale, messages: Messages): NavLink[] {
  return build(SECONDARY, locale, messages);
}

/** `sitemap.xml` uchun: bosh sahifa + barcha havolalar. */
export function allPaths(locale: Locale, messages: Messages): string[] {
  return [
    `/${locale}`,
    ...mainNav(locale, messages).map((link) => link.href),
    ...secondaryNav(locale, messages).map((link) => link.href),
  ];
}
