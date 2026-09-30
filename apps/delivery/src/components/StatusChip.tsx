import { type DeliveryStatus } from '@barff/types';

/**
 * Holat yorlig'i — KUNDUZI O'QILADIGAN.
 *
 * Ranglar ataylab to'q va fon ochiq: ochiq havoda past
 * kontrastli rang umuman ko'rinmaydi. Har bir juftlik 4.5:1 dan
 * yuqori (WCAG AA).
 */
const LABELS: Record<DeliveryStatus, string> = {
  CREATED: 'Yangi',
  ASSIGNED: 'Biriktirildi',
  PICKED_UP: 'Olindi',
  IN_TRANSIT: 'Yo‘lda',
  ARRIVED: 'Yetib keldi',
  DELIVERED: 'Topshirildi',
  FAILED: 'Bajarilmadi',
  CANCELLED: 'Bekor qilindi',
};

const TONES: Record<DeliveryStatus, string> = {
  CREATED: 'bg-[#eee] text-[#333]',
  ASSIGNED: 'bg-[#dbeafe] text-[#1e40af]',
  PICKED_UP: 'bg-[#dbeafe] text-[#1e40af]',
  IN_TRANSIT: 'bg-[#fef3c7] text-[#854d0e]',
  ARRIVED: 'bg-[#fef3c7] text-[#854d0e]',
  DELIVERED: 'bg-[#dcfce7] text-[#166534]',
  FAILED: 'bg-[#fee2e2] text-[#991b1b]',
  CANCELLED: 'bg-[#eee] text-[#333]',
};

export function statusLabel(status: string): string {
  return LABELS[status as DeliveryStatus] ?? status;
}

export function StatusChip({ status }: { status: string }) {
  const tone = TONES[status as DeliveryStatus] ?? 'bg-[#eee] text-[#333]';

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}
