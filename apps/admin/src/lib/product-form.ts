import { type Localized, type PublicImage } from '@barff/types';
import { formatMoney, fromMajor, money, slugify } from '@barff/utils';
import { cleanPayload } from './clean-payload';

/**
 * Mahsulot muharriri yordamchilari (toza funksiyalar — testlanadi).
 *
 * Narx foydalanuvchiga SO'MDA ko'rsatiladi va shu yerda kiritiladi,
 * serverga esa BUTUN TIYINDA ketadi (CLAUDE.md: pul butun sonda).
 */

/**
 * Kiritilgan so'm matnini tiyinga o'giradi.
 *
 * Qabul qilinadi: `18000`, `18 000`, `18 000,50`, `18000.5`.
 * Bo'sh, manfiy, harfli yoki 2 xonadan ortiq kasr — `null`
 * (jimgina yaxlitlash o'rniga rad etiladi: noto'g'ri narx saytga chiqmasin).
 */
export function parseSom(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  return money(fromMajor(Number(cleaned)).amount).amount;
}

/** Tiyinni tahrirlash maydoni uchun matnga aylantiradi: `1800050` -> `18000.5`. */
export function somInput(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '';

  const whole = Math.floor(amount / 100);
  const minor = amount % 100;

  if (minor === 0) return String(whole);

  return `${whole}.${String(minor).padStart(2, '0').replace(/0$/, '')}`;
}

/** Ko'rsatish uchun: `1800000` -> `18 000 so'm`. */
export function formatSom(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';

  return formatMoney(money(amount), 'uz-UZ', amount % 100 === 0 ? 0 : 2);
}

/** Narx oralig'i: `18 000 — 90 000 so'm` yoki bitta narx. */
export function formatPriceRange(from: number | null, to: number | null): string {
  if (from === null || to === null) return '—';
  if (from === to) return formatSom(from);

  return `${formatSom(from)} — ${formatSom(to)}`;
}

/** Nomdan slug taklifi (o'zbekcha nom ustuvor). */
export function suggestSlug(name: Localized): string {
  const text = [name.uz, name.ru, name.en].find((item) => (item ?? '').trim() !== '');

  return slugify(text ?? '');
}

/** Slugdan SKU taklifi: `apelsin-sharbati-1l` -> `APELSIN-SHARBATI-1L`. */
export function suggestSku(slug: string): string {
  return slug.toUpperCase().slice(0, 64);
}

/** Variant SKU taklifi: mahsulot SKU + hajm. */
export function suggestVariantSku(productSku: string, volumeMl: number): string {
  return `${productSku}-${volumeMl}`.slice(0, 64);
}

export interface ProductFormValue {
  slug: string;
  sku: string;
  categoryId: string;
  name: Localized;
  description: Localized;
  ingredients: Localized;
  storage: Localized;
  flavor: Localized;
  shelfLifeDays: string;
  displayOrder: string;
  isActive: boolean;
}

/** Formani API tanasiga o'giradi. Bo'sh ixtiyoriy maydonlar tushirib qoldiriladi. */
export function toProductPayload(form: ProductFormValue): Record<string, unknown> {
  const days = form.shelfLifeDays.trim();
  const order = form.displayOrder.trim();

  return cleanPayload({
    slug: form.slug.trim(),
    sku: form.sku.trim(),
    categoryId: form.categoryId,
    name: form.name,
    description: form.description,
    ingredients: form.ingredients,
    storage: form.storage,
    flavor: form.flavor,
    shelfLifeDays: days === '' ? null : Number(days),
    displayOrder: order === '' ? 0 : Number(order),
    isActive: form.isActive,
  });
}

/** Forma xatosi (mijoz tomonida, server baribir qayta tekshiradi). */
export function validateProductForm(form: ProductFormValue): string | null {
  if (form.categoryId === '') return 'Kategoriyani tanlang.';
  if (!Object.values(form.name).some((text) => text.trim() !== '')) return 'Nomini kiriting.';
  if (form.slug.trim() === '') return 'Slug (manzil) kiriting.';
  if (form.sku.trim() === '') return 'Artikul (SKU) kiriting.';

  const days = form.shelfLifeDays.trim();
  if (days !== '' && (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 3650)) {
    return 'Yaroqlilik muddati 1 dan 3650 kungacha butun son bo‘lishi kerak.';
  }

  return null;
}

/** Eng kichik mos manba — kichik rasm (ro'yxat/muharrir) uchun. */
export function thumbUrl(image: PublicImage | null | undefined): string | null {
  if (image === null || image === undefined || image.sources.length === 0) return null;

  const preferred = image.sources.filter((source) => source.format !== 'avif');
  const pool = preferred.length > 0 ? preferred : image.sources;

  return [...pool].sort((a, b) => a.width - b.width)[0]?.url ?? null;
}
