import { DEALER_STATUSES, DEALER_STATUS_TRANSITIONS, type DealerStatus } from '@barff/types';
import { type BadgeTone } from '@barff/ui';

/**
 * Diler holatlarining o'zbekcha nomlari (CLAUDE.md §5).
 *
 * Holat kodi bazada va API'da INGLIZCHA qoladi — u tizim qiymati.
 * Bu yerda faqat ko'rsatish uchun tarjima (lead va buyurtma
 * yorliqlari bilan bir xil yondashuv).
 */
export const DEALER_STATUS_LABELS: Record<DealerStatus, string> = {
  /*
    APOSTROF — TIPOGRAFIK (U+2018), ASCII emas.

    O'zbek tilida `o‘` va `g‘` alohida harflar, va butun panel shu
    belgini ishlatadi (`order-labels.ts`). Men bu yerda ASCII `'`
    yozgan edim va sinov tugmani TOPA OLMADI — matn ko'zga bir xil
    ko'rinadi, lekin bu boshqa belgi.
  */
  PENDING: 'Ko‘rib chiqilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  SUSPENDED: 'To‘xtatilgan',
};

export function dealerStatusLabel(status: string): string {
  return DEALER_STATUS_LABELS[status as DealerStatus] ?? status;
}

export function dealerStatusTone(status: string): BadgeTone {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'SUSPENDED') return 'warning';

  return 'info';
}

/**
 * Shu holatdan qaysi holatlarga o'tish mumkin.
 *
 * Ro'yxat `@barff/types` dagi YAGONA jadvaldan olinadi — server ham
 * o'shani tekshiradi (`canTransitionDealer`). Ikki joyda ikki xil
 * qoida yozilsa, panel ruxsat bergan o'tishni server rad etardi.
 */
export function nextDealerStatuses(status: string): DealerStatus[] {
  const map = DEALER_STATUS_TRANSITIONS as Record<string, readonly DealerStatus[]>;

  return [...(map[status] ?? [])];
}

/**
 * SABAB SHART bo'lgan o'tishlar.
 *
 * Qoida serverdagi `dealerStatusUpdateSchema` dan ko'chirilgan:
 * rad etish va to'xtatishda sabab bo'sh bo'lsa `400` qaytadi.
 * Panel buni OLDINDAN biladi, shunda xodim tugmani bosib, keyin
 * xato ko'rmaydi.
 */
export function reasonRequired(status: string): boolean {
  return status === 'REJECTED' || status === 'SUSPENDED';
}

export { DEALER_STATUSES, type DealerStatus };
