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
  /**
   * IXTIYORIY. Redis endi FAQAT kesh uchun (xavfsizlik holati S21G da
   * PostgreSQL ga ko'chirildi). Berilmasa ilova ishlaydi — har so'rov
   * bazaga tushadi, ya'ni sekinroq, lekin to'g'ri. Joylash muhitida
   * (cPanel) Redis yo'q (`docs/OPEN-QUESTIONS.md` Q18).
   */
  REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),

  /**
   * JWT sirlari. Access va refresh uchun ALOHIDA sirlar ishlatiladi: bitta sir
   * bo'lsa, access token refresh sifatida (yoki aksincha) taqdim etilishi
   * mumkin bo'lardi. Minimal uzunlik — 32 belgi.
   */
  JWT_ACCESS_SECRET: z.string().min(32, {
    message: "JWT_ACCESS_SECRET kamida 32 ta belgidan iborat bo'lishi kerak",
  }),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, {
    message: "JWT_REFRESH_SECRET kamida 32 ta belgidan iborat bo'lishi kerak",
  }),
  JWT_REFRESH_TTL: z.string().default('30d'),

  COOKIE_DOMAIN: z.string().optional(),
  /** Production'da har doim `true` bo'lishi kerak (faqat HTTPS orqali). */
  COOKIE_SECURE: booleanish.optional(),

  /** Bitta akkaunt uchun muvaffaqiyatsiz kirishlar chegarasi. */
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),

  /**
   * Bitta IP uchun chegara. Akkaunt chegarasidan ANCHA yuqori bo'lishi kerak:
   * bitta ofis yoki mobil operator NAT ortida o'nlab foydalanuvchi turadi va
   * ular bir-birining hisobiga bloklanib qolmasligi lozim. Bu chegara
   * odamlarning xatosini emas, avtomatlashtirilgan hujumni ushlash uchun.
   */
  AUTH_LOGIN_MAX_ATTEMPTS_PER_IP: z.coerce.number().int().min(1).default(50),

  AUTH_LOGIN_LOCK_SECONDS: z.coerce.number().int().min(1).default(900),

  /**
   * Foydalanuvchi ruxsatlari keshi (soniya). Qisqa TTL: rol o'zgarishi
   * shuncha vaqt ichida kuchga kiradi, kesh esa aniq bekor qilinganda
   * darhol yangilanadi.
   */
  AUTH_USER_CACHE_SECONDS: z.coerce.number().int().min(0).default(60),

  /**
   * Obyekt saqlash (S3 / MinIO).
   *
   * Ixtiyoriy: sozlanmasa lokalda xotiradagi variant ishlatiladi.
   * Production'da `StorageModule` ularning mavjudligini talab qiladi.
   */
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** MinIO subdomen ko'rinishidagi bucket manzillarini qo'llab-quvvatlamaydi. */
  S3_FORCE_PATH_STYLE: booleanish.optional(),
  /** Ommaviy fayllar beriladigan CDN manzili. */
  S3_PUBLIC_URL: z.url().optional(),

  /** Yuklanadigan faylning eng katta hajmi (bayt). */
  MEDIA_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .default(15 * 1024 * 1024),
  /** Imzolangan havola amal qilish muddati (soniya). */
  MEDIA_SIGNED_URL_TTL: z.coerce.number().int().min(30).default(300),

  /*
    FAYL TIZIMIDA SAQLASH — S3 bo'lmagan muhit uchun (cPanel, Q18).
    Uchalasi BIRGA beriladi; biri yetishmasa adapter tanlanmaydi.
  */
  /** Fayllar saqlanadigan katalog (mutlaq yo'l). */
  MEDIA_ROOT: z.string().min(1).optional(),
  /** Ommaviy fayllar beriladigan manzil, masalan `https://barff.uz/media`. */
  MEDIA_PUBLIC_URL: z.url().optional(),
  /**
   * Imzolangan havolalar uchun sir. S3 imzosining o'rnini bosadi,
   * shuning uchun JWT sirlari kabi uzun bo'lishi shart.
   */
  MEDIA_SIGNING_SECRET: z.string().min(32).optional(),

  /** Swagger standart holatda production'da o'chiq. */
  SWAGGER_ENABLED: booleanish.optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * BO'SH satr — BERILMAGAN bilan bir xil.
 *
 * NEGA KERAK: ba'zi joylash muhitlari (cPanel `Setup Node.js App`,
 * systemd unit fayllari, Docker `--env-file`) e'lon qilingan HAR BIR
 * o'zgaruvchini uzatadi — qiymat kiritilmagan bo'lsa ham, bo'sh satr
 * sifatida. `z.optional()` esa faqat `undefined` ni o'tkazadi, ya'ni
 * bo'sh `REDIS_URL` "Invalid URL" bilan ilovani KO'TARILTIRMAY qo'yadi.
 *
 * Bu o'lchab aniqlangan: cPanel to'plami aynan shu xato bilan yiqildi,
 * va xabar sababni ko'rsatmaydi — foydalanuvchi maydonni ATAYLAB bo'sh
 * qoldirgan edi (u muhitda Redis yo'q).
 *
 * Bo'sh satr hech bir o'zgaruvchi uchun MA'NOLI qiymat emas, shuning
 * uchun almashtirish butun obyektga qo'llanadi. Majburiy o'zgaruvchilar
 * baribir tekshiriladi: ular uchun natija "berilmagan" xatosi bo'ladi.
 */
function dropEmpty(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => !(typeof value === 'string' && value.trim() === '')),
  );
}

/** `ConfigModule.validate` uchun. Xatoda o'qishga yaroqli xabar beradi. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(dropEmpty(raw));

  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${lines.join('\n')}`);
  }

  return result.data;
}
