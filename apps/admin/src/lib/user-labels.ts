/**
 * Xodim rollari — ekrandagi nomlar va qisqa izoh (faqat ko'rsatish uchun).
 *
 * HUQUQLARNING o'zi serverda: bu matnlar qaysi rol nima qila olishini
 * tushuntiradi, lekin hech narsani cheklamaydi (CLAUDE.md §3).
 */
export const STAFF_ROLE_OPTIONS = [
  {
    code: 'SALES',
    label: 'Savdo menejeri',
    hint: 'Arizalar, dilerlar, buyurtmalarni ko‘rish, hisobotlar',
  },
  { code: 'WAREHOUSE', label: 'Omborchi', hint: 'Ombor, qoldiq, buyurtmalarni yig‘ish' },
  { code: 'LOGISTICS', label: 'Logist', hint: 'Yetkazish, marshrut va haydovchilarni biriktirish' },
  {
    code: 'DRIVER',
    label: 'Haydovchi',
    hint: 'Faqat o‘ziga biriktirilgan yetkazmalar (haydovchi ilovasi)',
  },
  { code: 'ADMIN', label: 'Administrator', hint: 'To‘liq huquq: xodimlar, sozlamalar, audit' },
] as const;

export type StaffRoleCode = (typeof STAFF_ROLE_OPTIONS)[number]['code'];

export function roleLabel(code: string): string {
  return STAFF_ROLE_OPTIONS.find((role) => role.code === code)?.label ?? code;
}

/** Harf va raqamlar; ko'zni adashtiradigan `0 O 1 l I` olib tashlangan. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * Tasodifiy parol (brauzerda, `crypto.getRandomValues`).
 *
 * `Math.random` ISHLATILMAYDI: u kriptografik emas. Parol faqat shu
 * oynada ko'rsatiladi va xodimga topshirilishi kerak; serverda faqat hash saqlanadi.
 */
export function generatePassword(length = 14): string {
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  let result = '';

  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));

    for (const byte of bytes) {
      // Modulo chetlanishini oldini olish: tarqalish tekis bo'lishi uchun ortiqcha baytlar tashlanadi.
      if (byte < limit && result.length < length) {
        result += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      }
    }
  }

  return result;
}

export function formatLastLogin(value: string | null): string {
  if (value === null) return 'Hali kirmagan';

  return new Date(value).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' });
}
