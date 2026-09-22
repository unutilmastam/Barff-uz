import { z } from 'zod';

/**
 * Muhit o'zgaruvchilari sxemasi.
 *
 * API ishga tushishi bilanoq tekshiriladi: biror majburiy o'zgaruvchi
 * yetishmasa yoki noto'g'ri bo'lsa — process darhol to'xtaydi (fail fast).
 * Yarim sozlangan holda ishlayotgan API eng yomon variant: xato faqat
 * birinchi so'rovda, ya'ni production'da ko'rinadi.
 */

const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const csv = z
  .string()
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().min(1)));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_URL: z.url().default('http://localhost:3000'),

  /**
   * Ruxsat etilgan origin'lar ro'yxati. Bo'sh qoldirilsa — hech bir brauzer
   * origin'i o'tmaydi. `*` qasddan qo'llab-quvvatlanmaydi: cookie'li
   * autentifikatsiya (S04) bilan u xavfsizlik teshigi (CLAUDE.md §12).
   */
  API_CORS_ORIGINS: csv.default([]),

  API_RATE_LIMIT_TTL: z.coerce.number().int().min(1).default(60),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),

  /**
   * API oldida nechta ishonchli proksi turibdi (Cloudflare -> ALB = 2).
   *
   * Standart qiymat 0 — hech kimga ishonilmaydi. Buning ahamiyati katta:
   * qiymat haqiqiydan KATTA bo'lsa, mijoz `X-Forwarded-For` ni o'zi yozib,
   * har so'rovda boshqa IP ko'rsatib rate limiter'ni chetlab o'tadi; KICHIK
   * bo'lsa — barcha foydalanuvchilar bitta proksi IP'si ostida birlashib,
   * bir-birining limitini yeydi.
   */
  API_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),

  /** Swagger standart holatda production'da o'chiq. */
  SWAGGER_ENABLED: booleanish.optional(),
});

export type Env = z.infer<typeof envSchema>;

/** `ConfigModule.validate` uchun. Xatoda o'qishga yaroqli xabar beradi. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${lines.join('\n')}`);
  }

  return result.data;
}
