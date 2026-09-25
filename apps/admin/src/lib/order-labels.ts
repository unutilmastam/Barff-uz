import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@barff/types';

/**
 * Buyurtma holatining o'qiladigan nomi.
 *
 * Diler portalidagi bilan BIR XIL matn (`apps/dealer/src/lib/
 * order-labels.ts`). Ikkalasi ajralib ketmasligi uchun, matn
 * o'zgarganda IKKALA joyda ham o'zgartirilishi kerak — hozir
 * ularni umumiy paketga chiqarish erta, chunki admin panel
 * bir tilda va diler portali keyinchalik ko'p tilli bo'lishi
 * mumkin (`CLAUDE.md` §18).
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  PENDING_REVIEW: 'Ko‘rib chiqilmoqda',
  CONFIRMED: 'Tasdiqlandi',
  RESERVED: 'Zaxiraga olindi',
  PICKING: 'Yig‘ilmoqda',
  PACKED: 'Qadoqlandi',
  READY_FOR_DELIVERY: 'Jo‘natishga tayyor',
  DRIVER_ASSIGNED: 'Haydovchi biriktirildi',
  IN_TRANSIT: 'Yo‘lda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export const ORDER_STATUS_TONE: Record<
  string,
  'neutral' | 'brand' | 'success' | 'warning' | 'danger'
> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  CONFIRMED: 'brand',
  RESERVED: 'brand',
  PICKING: 'brand',
  PACKED: 'brand',
  READY_FOR_DELIVERY: 'brand',
  DRIVER_ASSIGNED: 'brand',
  IN_TRANSIT: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function statusTone(status: string) {
  return ORDER_STATUS_TONE[status] ?? 'neutral';
}

/**
 * Shu holatdan qaysi holatlarga o'tish mumkin.
 *
 * Ro'yxat `@barff/types` dagi YAGONA jadvaldan quriladi — server ham
 * o'shani ishlatadi. Shuning uchun panel ko'rsatgan tugmani server
 * rad etmaydi va aksincha (S20 dagi lead quvuri bilan bir xil
 * yondashuv).
 */
export function nextStatuses(status: string): OrderStatus[] {
  const map = ORDER_STATUS_TRANSITIONS as Record<string, readonly OrderStatus[]>;

  return [...(map[status] ?? [])];
}

/** Pul — TIYINDA keladi. Hisob bu yerda YO'Q, faqat ko'rsatish. */
export { formatMoney } from '@barff/utils';

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
