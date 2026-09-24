import { LEAD_STATUSES, LEAD_STATUS_TRANSITIONS, type LeadStatus } from '@barff/types';

/**
 * Ariza holatlarining o'zbekcha nomlari (CLAUDE.md §9).
 *
 * Holat kodi bazada va API'da INGLIZCHA qoladi — u tizim qiymati.
 * Bu yerda faqat ko'rsatish uchun tarjima.
 */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Yangi',
  CONTACTED: "Bog'lanildi",
  QUALIFIED: 'Baholandi',
  NEGOTIATION: 'Muzokara',
  CONVERTED: 'Dilerga aylandi',
  REJECTED: 'Rad etildi',
};

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  DISTRIBUTOR: 'Distribyutor',
  WHOLESALE: 'Ulgurji savdo',
  RETAIL: 'Chakana savdo',
  HORECA: 'HoReCa',
  OTHER: 'Boshqa',
};

/** Rangi: yopilgan holatlar ajralib turadi. */
export function statusTone(status: LeadStatus): 'neutral' | 'info' | 'success' | 'danger' {
  if (status === 'CONVERTED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'NEW') return 'info';

  return 'neutral';
}

/**
 * Shu holatdan qaysi holatlarga o'tish mumkin.
 *
 * Ro'yxat `@barff/types` dagi YAGONA jadvaldan olinadi — server ham
 * o'shani ishlatadi. Ikki joyda ikki xil qoida yozilsa, panel
 * ruxsat bergan o'tishni server rad etardi.
 */
export function allowedTransitions(from: LeadStatus): LeadStatus[] {
  return [...(LEAD_STATUS_TRANSITIONS[from] ?? [])];
}

export { LEAD_STATUSES, type LeadStatus };
