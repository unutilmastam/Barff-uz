/**
 * Maxfiy maydonlarni loglardan olib tashlash (CLAUDE.md §12: parol va
 * token'lar hech qachon loglanmaydi).
 *
 * Ro'yxat kalit NOMI bo'yicha ishlaydi va ichma-ich obyektlarga ham tushadi.
 * Qiymat bo'yicha izlashga urinmaymiz — bu ishonchsiz va sekin.
 */
const SENSITIVE_KEYS = [
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apikey',
  'api_key',
  'clientsecret',
  'privatekey',
] as const;

const SENSITIVE = new Set<string>(SENSITIVE_KEYS);

export const REDACTED = '[REDACTED]';

const MAX_DEPTH = 6;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[DEPTH_LIMIT]';
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE.has(key.toLowerCase()) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}
