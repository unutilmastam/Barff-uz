import { describe, expect, it } from 'vitest';
import { uz } from '@/i18n/messages/uz';
import { allPaths, mainNav, secondaryNav } from './navigation';
import { ROUTE_READY, type RouteKey } from './routes';

describe('navigation', () => {
  it('havolalar til segmenti bilan quriladi', () => {
    for (const link of mainNav('ru', uz)) {
      expect(link.href.startsWith('/ru/')).toBe(true);
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  /**
   * Eng muhim shart: qurilmagan sahifaga havola CHIQMASLIGI kerak.
   *
   * Bunday havola 404 berishi ustiga, Next uni oldindan yuklamoqchi
   * bo'lib so'rovni osiltirib qo'yadi.
   */
  it("qurilmagan sahifaga havola yo'q", () => {
    const notReady = (Object.entries(ROUTE_READY) as [RouteKey, boolean][])
      .filter(([, ready]) => !ready)
      .map(([key]) => key);

    const hrefs = [...mainNav('uz', uz), ...secondaryNav('uz', uz)].map((link) => link.href);

    for (const key of notReady) {
      // `becomePartner` -> `become-partner`
      const path = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      expect(hrefs).not.toContain(`/uz/${path}`);
    }
  });

  it('sitemap royxati bosh sahifani va barcha havolalarni oz ichiga oladi', () => {
    const paths = allPaths('uz', uz);

    expect(paths[0]).toBe('/uz');
    for (const link of mainNav('uz', uz)) {
      expect(paths).toContain(link.href);
    }
    for (const link of secondaryNav('uz', uz)) {
      expect(paths).toContain(link.href);
    }
  });

  it('havolalar takrorlanmaydi', () => {
    const paths = allPaths('uz', uz);

    expect(new Set(paths).size).toBe(paths.length);
  });
});
