/**
 * Buyurtma holatining MIJOZGA ko'rinadigan matni.
 *
 * Texnik nom (`READY_FOR_DELIVERY`) dilerga ko'rsatilmaydi. Matn
 * bitta joyda: ro'yxatda, tafsilotda va vaqt chizig'ida bir xil
 * atalishi kerak.
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

/** Holat rangi — `Badge` uchun. */
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

/** Sana — kun aniqligida; vaqt diler uchun kerak emas. */
export function formatDate(iso: string): string {
  const date = new Date(iso);

  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}
