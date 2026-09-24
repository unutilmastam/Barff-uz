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

/**
 * Pulni ko'rsatish — NATIJA MUHITGA BOG'LIQ EMAS.
 *
 * `Intl` BUTUNLAY ishlatilmaydi va buni ikki bosqichda O'LCHAB
 * aniqladim:
 *
 *   1. `style: 'currency'` — Node `900 soʻm`, Chromium `UZS 900`.
 *   2. Oddiy `NumberFormat` ham — Node `18 000`, Chromium `18,000`.
 *
 * Ya'ni AJRATGICH ham muhitga bog'liq. Sahifa serverda chizilib
 * brauzerda qayta chizilganda narx O'ZGARIB ko'rinardi: React uchun
 * bu gidratsiya nomuvofiqligi, mijoz uchun esa "narx boshqacha"
 * degan taassurot.
 *
 * Shuning uchun guruhlash ham, yorliq ham QO'LDA. O'zbek yozuvida
 * mingliklar TOR AJRALMAS BO'SHLIQ bilan ajratiladi (U+202F), kasr
 * esa vergul bilan.
 */
const GROUP_SEPARATOR = '\u202f';
const DECIMAL_SEPARATOR = ',';

const CURRENCY_LABELS: Record<string, string> = { UZS: "so'm" };

/** Mingliklarni ajratadi: `18000` -> `18 000`. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/**
 * Ko'rsatish uchun: 1250050 -> "12 500,50 so'm".
 *
 * `fractionDigits` — butun so'mgacha yaxlitlash uchun `0`. Katalog va
 * savatda tiyin ko'rsatilmaydi: u faqat HISOBDA ma'noli.
 *
 * DIQQAT: `locale` parametri qoldirilgan, lekin ISHLATILMAYDI —
 * chaqiruvchilarni buzmaslik uchun. Uch tilda ham son bir xil
 * yoziladi; farq faqat valyuta nomida bo'lardi va u hozircha bitta.
 */
export function formatMoney(value: Money, _locale = 'uz-UZ', fractionDigits = 2): string {
  const negative = value.amount < 0;
  const absolute = Math.abs(value.amount);

  const major = Math.floor(absolute / MINOR_UNITS_PER_MAJOR);
  const minor = absolute % MINOR_UNITS_PER_MAJOR;

  const rounded = fractionDigits === 0 && minor >= MINOR_UNITS_PER_MAJOR / 2 ? major + 1 : major;

  const whole = group(String(fractionDigits === 0 ? rounded : major));

  const amount =
    fractionDigits === 0 ? whole : `${whole}${DECIMAL_SEPARATOR}${String(minor).padStart(2, '0')}`;

  const label = CURRENCY_LABELS[value.currency] ?? value.currency;

  return `${negative ? '-' : ''}${amount} ${label}`;
}
