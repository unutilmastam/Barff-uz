import { type Badge } from '@barff/ui';

type Tone = NonNullable<Parameters<typeof Badge>[0]['tone']>;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  ISSUED: 'Berilgan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
  CANCELLED: 'Bekor qilingan',
};

export const INVOICE_STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  ISSUED: 'brand',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  CANCELLED: 'neutral',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Naqd',
  BANK_TRANSFER: 'Bank o‘tkazmasi',
  CARD: 'Karta',
  OFFSET: 'O‘zaro hisob',
  OTHER: 'Boshqa',
};

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function invoiceStatusTone(status: string): Tone {
  return INVOICE_STATUS_TONE[status] ?? 'neutral';
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/**
 * Tiyindagi summa — KO'RSATISH uchun.
 *
 * Bazada va so'rovlarda pul HAR DOIM tiyinda, butun sonda
 * (`docs/BILLING-POLICY.md` §1). Bo'lish FAQAT shu yerda, ekranga
 * chiqarishdan oldin bo'ladi — hisob-kitobda emas.
 */
export function formatMinor(minor: number, currency = 'UZS'): string {
  const major = minor / 100;
  const text = major.toLocaleString('uz-UZ', {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return currency === 'UZS' ? `${text} so‘m` : `${text} ${currency}`;
}

/**
 * Muddati o'tganmi.
 *
 * Faqat OCHIQ hujjat uchun ma'noli: to'langan hujjatning muddati
 * o'tgan bo'lsa ham, u endi muammo emas.
 */
export function isOverdue(status: string, dueAt: string | null): boolean {
  if (dueAt === null) return false;
  if (status !== 'ISSUED' && status !== 'PARTIALLY_PAID') return false;

  return new Date(dueAt).getTime() < Date.now();
}
