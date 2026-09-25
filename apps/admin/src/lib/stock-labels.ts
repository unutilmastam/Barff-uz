import { type StockMovementType } from '@barff/types';
import { type BadgeTone } from '@barff/ui';

/**
 * Harakat turlarining o'zbekcha nomlari (CLAUDE.md §7).
 *
 * Kod bazada INGLIZCHA qoladi — u tizim qiymati. Apostrof
 * TIPOGRAFIK (U+2018), panelning qolgan yorliqlari bilan bir xil:
 * ASCII `'` ekranda bir xil ko'rinadi, lekin qidiruv va sinov uni
 * topa olmaydi (S29 da o'lchab aniqlangan).
 */
export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  IN: 'Kelim',
  OUT: 'Chiqim',
  RESERVED: 'Band qilindi',
  RELEASED: 'Band bekor qilindi',
  TRANSFER: 'Ko‘chirish',
  ADJUSTMENT: 'Tuzatish',
  RETURN: 'Qaytim',
};

export function movementLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type as StockMovementType] ?? type;
}

export function movementTone(type: string): BadgeTone {
  if (type === 'IN' || type === 'RETURN') return 'success';
  if (type === 'OUT') return 'warning';
  if (type === 'ADJUSTMENT') return 'danger';
  if (type === 'TRANSFER') return 'info';

  return 'neutral';
}

/**
 * Qo'lda kiritiladigan turlar.
 *
 * `RESERVED`/`RELEASED` bu yerda YO'Q: bandlash buyurtma oqimidan
 * keladi (S31), qo'lda emas. Omborchi "band qilish" tugmasini
 * bossa, buyurtmasiz zaxira paydo bo'lardi va uni hech kim
 * bo'shatmasdi.
 */
export const MANUAL_TYPES = ['IN', 'OUT', 'RETURN'] as const;

/** Mavjud (band qilinmagan) qoldiq. */
export function available(quantity: number, reserved: number): number {
  return quantity - reserved;
}

/** Kam qolganmi. Chegara belgilanmagan bo'lsa — kuzatilmaydi. */
export function isLow(
  quantity: number,
  reserved: number,
  threshold: number | null | undefined,
): boolean {
  return threshold != null && available(quantity, reserved) <= threshold;
}
