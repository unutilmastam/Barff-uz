/**
 * Maxfiy maydonlarni loglardan olib tashlash (CLAUDE.md §12: parol va
 * token'lar hech qachon loglanmaydi).
 *
 * Ro'yxat kalit NOMI bo'yicha ishlaydi va ichma-ich obyektlarga ham tushadi.
 * Qiymat bo'yicha izlashga urinmaymiz — bu ishonchsiz va sekin.
 */
/**
 * Kalit nomida shu BO'LAKLARDAN biri bo'lsa, qiymat yashiriladi.
 *
 * Avval bu aniq nomlar ro'yxati edi (`password`, `token`, ...). U
 * `passwordHash`, `mfaSecret`, `resetToken` kabi nomlarni O'TKAZIB
 * yuborardi — foydalanuvchi qatori jurnalga tushsa, parol xeshi ham
 * tushardi (S38 shuni ushladi). Bo'lak bo'yicha tekshirish bunday
 * nomlarni ham qamraydi; ortiqcha yashirish (`tokenCount`) zararsiz,
 * yetishmay qolgan yashirish esa sir sizishi.
 *
 * Kalit normallashtiriladi: kichik harf, `_`, `-` va bo'shliqsiz
 * (`api_key`, `Api-Key`, `apiKey` bir xil).
 */
const SENSITIVE_PARTS = [
  'password',
  'passwd',
  'token',
  'secret',
  'hash',
  'authorization',
  'cookie',
  'apikey',
  'privatekey',
  'signature',
] as const;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_\-\s]/g, '');
  return SENSITIVE_PARTS.some((part) => normalized.includes(part));
}

/**
 * Qiymat bo'yicha ikkinchi to'siq: kalit nomi begunoh bo'lsa ham
 * (`note`, `reason`), ichida JWT yoki argon2 xesh bo'lsa yashiriladi.
 * Faqat ANIQ, past xato ehtimolli shakllar — oddiy matn tegilmaydi.
 */
const SECRET_VALUE = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|\$argon2[a-z]*\$.+)$/;

export const REDACTED = '[REDACTED]';

const MAX_DEPTH = 6;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[DEPTH_LIMIT]';
  if (typeof value === 'string') return SECRET_VALUE.test(value) ? REDACTED : value;
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}
