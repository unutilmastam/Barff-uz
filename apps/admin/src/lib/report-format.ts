import { type ReportColumnType } from '@barff/types';
import { formatMinor } from './billing-labels';

/**
 * Hisobot katagini KO'RSATISH uchun formatlash.
 *
 * Server pulni tiyinda beradi (`docs/BILLING-POLICY.md` §1);
 * so'mga aylantirish FAQAT shu yerda, ekranga chiqarishda bo'ladi.
 * Eksport esa tiyinni o'zini beradi.
 */
export function formatCell(type: ReportColumnType, value: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (type) {
    case 'money':
      return formatMinor(Number(value));
    case 'percent':
      return `${Number(value).toLocaleString('uz-UZ', { maximumFractionDigits: 1 })}%`;
    case 'integer':
      return Number(value).toLocaleString('uz-UZ');
    case 'decimal':
      return Number(value).toLocaleString('uz-UZ', { maximumFractionDigits: 1 });
    case 'datetime':
      return new Date(String(value)).toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        dateStyle: 'short',
        timeStyle: 'short',
      });
    default:
      return String(value);
  }
}

/** Raqamli ustunlar o'ngga tekislanadi — ustunda taqqoslash osonlashadi. */
export function isNumeric(type: ReportColumnType): boolean {
  return type === 'money' || type === 'integer' || type === 'decimal' || type === 'percent';
}

const STATUS_LABELS: Record<string, string> = {
  // Buyurtma
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
  // Yetkazma
  CREATED: 'Yangi',
  ASSIGNED: 'Biriktirildi',
  PICKED_UP: 'Olindi',
  ARRIVED: 'Yetib keldi',
  FAILED: 'Bajarilmadi',
  // Ariza
  NEW: 'Yangi',
  CONTACTED: 'Bog‘lanildi',
  QUALIFIED: 'Saralandi',
  NEGOTIATION: 'Muzokara',
  CONVERTED: 'Diler bo‘ldi',
  REJECTED: 'Rad etildi',
  // Ombor harakati
  IN: 'Kirim',
  OUT: 'Chiqim',
  TRANSFER: 'Ko‘chirish',
  ADJUSTMENT: 'Tuzatish',
  RETURN: 'Qaytarish',
  RELEASED: 'Bo‘shatildi',
};

/** Holat kodi — o'zbekcha nom. Ustun `status`/`type` bo'lsa ishlatiladi. */
export function labelFor(columnKey: string, value: string | number | null): string | null {
  if (columnKey !== 'status' && columnKey !== 'type') return null;

  return typeof value === 'string' ? (STATUS_LABELS[value] ?? value) : null;
}
