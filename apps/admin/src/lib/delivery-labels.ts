import { DELIVERY_STATUS_TRANSITIONS, type DeliveryStatus } from '@barff/types';
import { type BadgeTone } from '@barff/ui';

/**
 * Yetkazma holatlarining o'zbekcha nomlari (CLAUDE.md §6).
 *
 * Matn haydovchi ilovasidagi bilan BIR XIL
 * (`apps/delivery/src/components/StatusChip.tsx`). Ikkalasi
 * ajralib ketsa, logist va haydovchi bitta holatni BOSHQA-BOSHQA
 * nom bilan aytishardi va telefondagi suhbat chalkashardi.
 *
 * Apostrof TIPOGRAFIK (U+2018) — panelning qolgan yorliqlari
 * bilan bir xil (S29 da o'lchab aniqlangan tuzoq).
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  CREATED: 'Yangi',
  ASSIGNED: 'Biriktirildi',
  PICKED_UP: 'Olindi',
  IN_TRANSIT: 'Yo‘lda',
  ARRIVED: 'Yetib keldi',
  DELIVERED: 'Topshirildi',
  FAILED: 'Bajarilmadi',
  CANCELLED: 'Bekor qilindi',
};

export function deliveryStatusLabel(status: string): string {
  return DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status;
}

export function deliveryStatusTone(status: string): BadgeTone {
  if (status === 'DELIVERED') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';
  if (status === 'CREATED') return 'warning';

  return 'info';
}

/**
 * Shu holatdan qaysi holatlarga o'tish mumkin.
 *
 * Ro'yxat `@barff/types` dagi YAGONA jadvaldan — server ham
 * o'shani tekshiradi.
 *
 * `FAILED -> ASSIGNED` shu yerda: bajarilmagan yetkazmani QAYTA
 * urinish (`ROADMAP.md` S34: "failed-delivery handling and
 * retry"). Bu avtomatik EMAS va bo'lmasligi kerak — qaysi
 * haydovchiga, qachon degan savol logistniki
 * (`docs/DELIVERY-POLICY.md` §3).
 */
export function nextDeliveryStatuses(status: string): DeliveryStatus[] {
  const map = DELIVERY_STATUS_TRANSITIONS as Record<string, readonly DeliveryStatus[]>;

  return [...(map[status] ?? [])];
}

/** Ish tugaganmi — navbatda ko'rsatilmaydi. */
export function isDeliveryClosed(status: string): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

/**
 * Logist DIQQATINI talab qiladigan holatlar.
 *
 * `CREATED` — haydovchi biriktirilmagan, ya'ni hech kim
 * bormayapti. `FAILED` — urinish bo'ldi va muvaffaqiyatsiz.
 * Ikkalasi ham TO'XTAB QOLGAN ish.
 */
export function needsAttention(status: string): boolean {
  return status === 'CREATED' || status === 'FAILED';
}
