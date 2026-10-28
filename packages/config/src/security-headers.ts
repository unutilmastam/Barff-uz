/**
 * Next ilovalari uchun umumiy xavfsizlik sarlavhalari (CLAUDE.md §12, S41).
 *
 * BIR JOYDA: to'rtta ilova (`web`, `admin`, `dealer`, `delivery`) shundan
 * foydalanadi, shuning uchun biri unutib qolmaydi. S41 o'lchaganda ommaviy
 * sayt (`web`) HECH QANDAY xavfsizlik sarlavhasiz ketayotgani
 * ma'lum bo'ldi — API'da `helmet` bor edi, Next ilovalarida esa faqat
 * admin/diler/haydovchida ikkitasi.
 *
 * ATAYLAB YO'Q:
 *  - `script-src` bilan CSP. Tema yaltirashining oldini oluvchi inline
 *    skript (CLAUDE.md §16) va Next'ning gidratsiya skriptlari `nonce`
 *    talab qiladi; uni noto'g'ri qo'ysak sayt jimgina ishlamay qoladi.
 *    Hozirgi CSP faqat xavfsiz yo'nalishlarni yopadi (frame, base, object, form).
 *  - `preload` HSTS: bu qaytarib bo'lmaydigan qaror, domen egasi o'zi qilsin.
 *
 * `Cross-Origin-Embedder-Policy` ham yo'q: u uchinchi tomon rasmlari va
 * shriftlarini sindirishi mumkin.
 *
 * Bu fayl `next.config.ts` lardan NISBIY yo'l bilan import qilinadi — Next
 * config'ni ishchi maydon paketlarini transpilatsiya qilmasdan o'qiydi,
 * shuning uchun bu yerda hech qanday tashqi bog'liqlik bo'lmasligi shart.
 */
export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeaderOptions {
  /** `next dev` serveri: HSTS yoqilmaydi (lokal http). */
  isDevServer: boolean;
  /** Kamera kerakmi (haydovchi: topshirish isboti surati). */
  camera?: boolean;
  /** Ommaviy sayt tashqi havolalarda manzil ko'rsatishi mumkin; ichki ilovalar — yo'q. */
  referrer?: 'no-referrer' | 'strict-origin-when-cross-origin';
}

export function securityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  const camera = options.camera === true ? 'camera=(self)' : 'camera=()';

  const headers: SecurityHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: options.referrer ?? 'no-referrer' },
    {
      key: 'Permissions-Policy',
      value: [camera, 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()'].join(', '),
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    {
      key: 'Content-Security-Policy',
      value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
    },
  ];

  // HSTS faqat HTTPS orqali xizmat qilinganda ma'noli; brauzerlar http'da uni e'tiborsiz qoldiradi.
  if (!options.isDevServer) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}
