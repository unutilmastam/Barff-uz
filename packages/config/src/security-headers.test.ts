import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers';

const header = (list: { key: string; value: string }[], key: string) =>
  list.find((item) => item.key === key)?.value;

describe('securityHeaders', () => {
  const prod = securityHeaders({ isDevServer: false });

  it('hamma ilovada majburiy sarlavhalar bor', () => {
    expect(header(prod, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(prod, 'X-Frame-Options')).toBe('DENY');
    expect(header(prod, 'Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(header(prod, 'Referrer-Policy')).toBe('no-referrer');
  });

  it('CSP faqat xavfsiz yo‘nalishlarni yopadi va gidratsiyani sindirmaydi', () => {
    const csp = header(prod, 'Content-Security-Policy') ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    // `script-src` yo'q: nonce'siz u tema skripti va Next gidratsiyasini sindiradi.
    expect(csp).not.toContain('script-src');
  });

  it('kamera standart holda yopiq, faqat so‘ralganda ochiladi', () => {
    expect(header(prod, 'Permissions-Policy')).toContain('camera=()');
    expect(
      header(securityHeaders({ isDevServer: false, camera: true }), 'Permissions-Policy'),
    ).toContain('camera=(self)');
    // Joylashuv va mikrofon hech qachon ochilmaydi (§6: GPS talab qilinmagan).
    expect(header(prod, 'Permissions-Policy')).toContain('geolocation=()');
    expect(header(prod, 'Permissions-Policy')).toContain('microphone=()');
  });

  it('HSTS productionda bor, `preload`siz; dev serverda yo‘q', () => {
    const hsts = header(prod, 'Strict-Transport-Security');
    expect(hsts).toBe('max-age=31536000; includeSubDomains');
    expect(hsts).not.toContain('preload');
    expect(
      header(securityHeaders({ isDevServer: true }), 'Strict-Transport-Security'),
    ).toBeUndefined();
  });

  it('ommaviy sayt uchun yumshoqroq Referrer-Policy', () => {
    const web = securityHeaders({
      isDevServer: false,
      referrer: 'strict-origin-when-cross-origin',
    });
    expect(header(web, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});

describe('to‘rtta Next ilovasi', () => {
  /**
   * Yangi ilova qo'shilganda yoki biri `headers()` ni qayta yozganda
   * umumiy to'plamni unutib qo'ymasligi uchun (web aynan shunday
   * sarlavhasiz ketayotgan edi).
   */
  for (const app of ['web', 'admin', 'dealer', 'delivery']) {
    it(`${app} umumiy sarlavhalarni ishlatadi`, () => {
      const source = readFileSync(
        resolve(__dirname, `../../../apps/${app}/next.config.ts`),
        'utf8',
      );
      expect(source).toContain("from '../../packages/config/src/security-headers'");
      expect(source).toContain('securityHeaders(');
    });
  }

  it('faqat haydovchi ilovasi kamerani oladi', () => {
    const read = (app: string) =>
      readFileSync(resolve(__dirname, `../../../apps/${app}/next.config.ts`), 'utf8');
    expect(read('delivery')).toContain('camera: true');
    for (const app of ['web', 'admin', 'dealer']) expect(read(app)).not.toContain('camera: true');
  });
});
