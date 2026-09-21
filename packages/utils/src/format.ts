/** Ko'rsatish uchun formatlash. */

/** O'zbekiston raqami: 9 ta raqam + 998 kodi. */
const UZ_PHONE_DIGITS = 12;

/** Faqat raqamlarni qoldiradi va 998 prefiksini normallashtiradi. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  // 901234567 -> 998901234567
  if (digits.length === 9) return `998${digits}`;
  // 8901234567 kabi eski yozuvlar
  if (digits.length === 10 && digits.startsWith('8')) return `998${digits.slice(1)}`;
  return digits;
}

export function isValidUzPhone(input: string): boolean {
  const digits = normalizePhone(input);
  return digits.length === UZ_PHONE_DIGITS && digits.startsWith('998');
}

/** 998901234567 -> "+998 90 123 45 67" */
export function formatPhone(input: string): string {
  const digits = normalizePhone(input);
  if (digits.length !== UZ_PHONE_DIGITS) return input;

  const operator = digits.slice(3, 5);
  const part1 = digits.slice(5, 8);
  const part2 = digits.slice(8, 10);
  const part3 = digits.slice(10, 12);
  return `+998 ${operator} ${part1} ${part2} ${part3}`;
}

export function formatNumber(value: number, locale = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Matnni qisqartirish — so'z o'rtasidan kesmaydi. */
export function truncate(input: string, maxLength: number, suffix = '…'): string {
  if (input.length <= maxLength) return input;

  const cut = input.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const safe = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}${suffix}`;
}
