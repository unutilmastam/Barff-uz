/**
 * Pul bilan ishlash.
 *
 * MUHIM: pul HAR DOIM butun sonda, eng kichik birlikda (tiyin) saqlanadi.
 * `number` bilan kasr hisob-kitob qilinsa yaxlitlash xatosi to'planadi
 * (0.1 + 0.2 !== 0.3) — buyurtma summasida bu qabul qilinmaydi.
 */

/** Asosiy valyuta. Ko'p valyutali bo'lsa bu yer kengaytiriladi. */
export const DEFAULT_CURRENCY = 'UZS' as const;
export type Currency = typeof DEFAULT_CURRENCY;

/** 1 so'm = 100 tiyin. */
const MINOR_UNITS_PER_MAJOR = 100;

export interface Money {
  /** Eng kichik birlikdagi butun son (tiyin). */
  amount: number;
  currency: Currency;
}

export function money(amount: number, currency: Currency = DEFAULT_CURRENCY): Money {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`Pul miqdori butun son bo'lishi kerak (tiyin), berildi: ${amount}`);
  }
  return { amount, currency };
}

/** So'mdan tiyinga: 12500.5 -> 1250050 */
export function fromMajor(major: number, currency: Currency = DEFAULT_CURRENCY): Money {
  return money(Math.round(major * MINOR_UNITS_PER_MAJOR), currency);
}

/** Tiyindan so'mga (faqat ko'rsatish uchun). */
export function toMajor(value: Money): number {
  return value.amount / MINOR_UNITS_PER_MAJOR;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Valyutalar mos emas: ${a.currency} va ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

/** Miqdorga ko'paytirish (buyurtma qatori: narx × soni). */
export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`Miqdor butun son bo'lishi kerak, berildi: ${quantity}`);
  }
  return money(value.amount * quantity, value.currency);
}

/**
 * Foizli chegirma. Yaxlitlash HAR DOIM pastga — mijoz foydasiga emas,
 * balki jamini oshirib yubormaslik uchun (qatorlar yig'indisi jamidan oshmasin).
 */
export function applyPercentDiscount(value: Money, percent: number): Money {
  if (percent < 0 || percent > 100) {
    throw new RangeError(`Chegirma 0–100 oralig'ida bo'lishi kerak, berildi: ${percent}`);
  }
  const discount = Math.floor((value.amount * percent) / 100);
  return money(value.amount - discount, value.currency);
}

export function sumMoney(values: readonly Money[], currency: Currency = DEFAULT_CURRENCY): Money {
  return values.reduce<Money>((total, value) => addMoney(total, value), money(0, currency));
}

/** Ko'rsatish uchun: 1250050 -> "12 500,50 so'm" */
export function formatMoney(value: Money, locale = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: 2,
  }).format(toMajor(value));
}
