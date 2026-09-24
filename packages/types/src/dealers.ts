/**
 * Diler domeni (CLAUDE.md §5).
 *
 * Holatlar SERVER va PANEL uchun BITTA manbada: panel ko'rsatgan
 * tugmani server rad etsa, foydalanuvchi sababsiz xatoga uchrardi
 * (S20 da lead quvuri uchun ham shu yondashuv tanlangan).
 */

/**
 * Diler arizasining holati.
 *
 * `PENDING` — ariza yuborilgan, ko'rib chiqilmagan.
 * `APPROVED` — tasdiqlangan; FAQAT shu holatda diler endpoint'lariga
 *   kira oladi.
 * `REJECTED` — rad etilgan.
 * `SUSPENDED` — vaqtincha to'xtatilgan (qarz, shartnoma buzilishi).
 *   `REJECTED` dan farqi: tasdiq qaytarilishi mumkin.
 */
export const DEALER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

export type DealerStatus = (typeof DEALER_STATUSES)[number];

/**
 * Ruxsat etilgan o'tishlar.
 *
 * `REJECTED` — OXIRGI holat emas: rad etilgan ariza qayta ko'rib
 * chiqilishi mumkin (hujjat to'g'rilangan, ma'lumot aniqlangan).
 * `PENDING` ga qaytish shuning uchun ochiq.
 */
export const DEALER_STATUS_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
  REJECTED: ['PENDING'],
  SUSPENDED: ['APPROVED', 'REJECTED'],
} as const satisfies Record<DealerStatus, readonly DealerStatus[]>;

export function canTransitionDealer(from: DealerStatus, to: DealerStatus): boolean {
  return (DEALER_STATUS_TRANSITIONS[from] as readonly DealerStatus[]).includes(to);
}

/**
 * Diler FAQAT shu holatda ishlay oladi.
 *
 * Bu bitta joyda turadi, chunki tekshiruv bir necha qatlamda
 * takrorlanadi (guard, servis, panel) va ular bir-biridan farq qilib
 * ketmasligi kerak.
 */
export function isDealerActive(status: DealerStatus): boolean {
  return status === 'APPROVED';
}

/**
 * Diler darajasi — narx va chegirma siyosati shunga bog'lanadi (S23).
 *
 * Darajalar bazada yoziladi (`dealer_tiers`), chunki ular biznes
 * qarori: BARFF ularni o'zgartirishi mumkin. Bu yerda faqat TIP.
 */
export interface DealerTierSummary {
  id: string;
  code: string;
  name: string;
  /** Asosiy narxdan chegirma, foizning yuzdan bir ulushida (250 = 2.5%). */
  discountBasisPoints: number;
}
