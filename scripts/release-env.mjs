/*
  Chiqarish (release) sozlamalarini TEKSHIRADI.

  `NEXT_PUBLIC_*` qiymatlari Next tomonidan QURISH PAYTIDA bundle ichiga
  yoziladi. Noto'g'ri (yoki `localhost`) qiymat bilan yig'ilgan to'plam
  serverda JIM ishlamaydi: sahifa ochiladi, lekin API'ga `localhost` ga
  so'rov ketadi va hamma narsa "yuklanmadi" bo'lib qoladi. F01 da
  `dist-cpanel` ichida 116 ta faylda `localhost:3000` borligi
  o'lchab topildi.

  Shuning uchun qiymatlar yig'ishdan OLDIN tekshiriladi.
*/

/** Majburiy o'zgaruvchilar va ular qanday ko'rinishda bo'lishi kerak. */
export const REQUIRED = [
  { key: 'NEXT_PUBLIC_API_BASE_URL', mustEndWith: '/api/v1' },
  { key: 'NEXT_PUBLIC_SITE_URL', mustEndWith: undefined },
];

/** Ixtiyoriy, lekin berilsa ular ham to'g'ri bo'lishi shart. */
export const OPTIONAL_URLS = ['NEXT_PUBLIC_ADMIN_URL', 'NEXT_PUBLIC_DEALER_URL'];

const LOCAL = /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i;

function checkUrl(key, value, mustEndWith) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return `${key}: yaroqsiz manzil (${value})`;
  }

  if (url.protocol !== 'https:') return `${key}: faqat https:// (${value})`;
  if (LOCAL.test(value)) return `${key}: lokal manzil production'ga yaramaydi (${value})`;
  if (mustEndWith !== undefined && !url.pathname.replace(/\/$/, '').endsWith(mustEndWith)) {
    return `${key}: manzil ${mustEndWith} bilan tugashi kerak (${value})`;
  }

  return null;
}

/** Xatolar ro'yxatini qaytaradi; bo'sh ro'yxat — hammasi joyida. */
export function validateReleaseEnv(env) {
  const problems = [];

  for (const { key, mustEndWith } of REQUIRED) {
    const value = env[key];
    if (value === undefined || value.trim() === '') {
      problems.push(`${key}: berilmagan`);
      continue;
    }
    const problem = checkUrl(key, value.trim(), mustEndWith);
    if (problem !== null) problems.push(problem);
  }

  for (const key of OPTIONAL_URLS) {
    const value = env[key];
    if (value === undefined || value.trim() === '') continue;
    const problem = checkUrl(key, value.trim(), undefined);
    if (problem !== null) problems.push(problem);
  }

  const indexing = env['NEXT_PUBLIC_ALLOW_INDEXING'];
  if (indexing !== undefined && !['true', 'false'].includes(indexing)) {
    problems.push(`NEXT_PUBLIC_ALLOW_INDEXING: faqat true yoki false (${indexing})`);
  }

  return problems;
}

/** `KEY=value` qatorlarini o'qiydi (izoh va bo'sh qatorlar o'tkaziladi, tirnoqlar olib tashlanadi). */
export function parseEnvFile(text) {
  const result = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    result[key] = value;
  }

  return result;
}
