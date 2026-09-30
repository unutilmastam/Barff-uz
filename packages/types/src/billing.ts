/**
 * Pul: hisob-faktura, to'lov, balans (CLAUDE.md §10, S36).
 *
 * HAMMA SUMMA TIYINDA, BUTUN SONDA. Suzuvchi nuqta bilan
 * hisoblanganda yaxlitlash xatosi to'planadi va u balansda
 * ko'rinmay qoladi (`packages/utils/src/money.ts`).
 */

export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * QO'LDA qilinadigan o'tishlar.
 *
 * `PARTIALLY_PAID` va `PAID` bu jadvalda YO'Q, chunki ular
 * QO'LDA qo'yilmaydi — ular to'lov taqsimotidan KELIB CHIQADI
 * (`invoiceStatusFor`). Ularni qo'lda qo'yish imkoni bo'lsa,
 * "to'landi" deb belgilangan, lekin pul kelmagan hisob-faktura
 * paydo bo'lardi va balans jim yolg'on gapirardi.
 */
export const INVOICE_STATUS_TRANSITIONS = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['CANCELLED'],
  PARTIALLY_PAID: ['CANCELLED'],
  PAID: [],
  CANCELLED: [],
} as const satisfies Record<InvoiceStatus, readonly InvoiceStatus[]>;

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return (INVOICE_STATUS_TRANSITIONS[from] as readonly InvoiceStatus[]).includes(to);
}

/** Bekor qilingan hisob-faktura balansga ham, qarzga ham KIRMAYDI. */
export const OPEN_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID'] as const;

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'OFFSET', 'OTHER'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Hisob-faktura holati TAQSIMLANGAN SUMMADAN kelib chiqadi.
 *
 * Bu yagona manba: holat ham, qolgan qarz ham shu ikki raqamdan
 * hisoblanadi. Holatni alohida saqlash "to'landi deb turibdi,
 * lekin qolgan qarz noldan katta" degan holatni yaratardi va
 * qaysi biri to'g'ri ekani ko'rinmasdi.
 */
export function invoiceStatusFor(total: number, allocated: number): InvoiceStatus {
  if (allocated <= 0) return 'ISSUED';
  if (allocated >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

/** Hisob-faktura bo'yicha QOLGAN qarz. Hech qachon manfiy emas. */
export function invoiceOutstanding(total: number, allocated: number): number {
  return Math.max(0, total - allocated);
}

export interface DealerBalance {
  /** Berilgan va bekor qilinmagan hisob-fakturalar yig'indisi (tiyin). */
  invoiced: number;
  /** Kelgan to'lovlar yig'indisi (tiyin) — taqsimlanganiga qaramay. */
  paid: number;
  /**
   * Qarz (tiyin). MUSBAT — diler qarzdor, MANFIY — diler
   * oldindan to'lagan.
   *
   * Bu ayirma, saqlangan qiymat emas.
   */
  outstanding: number;
  /** Hech bir hisob-fakturaga biriktirilmagan to'lov qoldig'i (tiyin). */
  unallocated: number;
}

/**
 * Balans — AYIRMA, saqlangan qiymat emas (S36 DoD).
 *
 * Saqlangan balans jurnaldan ajralib ketishi mumkin va ajralganda
 * qaysi biri to'g'ri ekani ko'rinmaydi. Omborda ham shu sabab
 * qoldiq harakat jurnalining proyeksiyasi qilingan (S30).
 */
export function dealerBalance(invoiced: number, paid: number, allocated: number): DealerBalance {
  return {
    invoiced,
    paid,
    outstanding: invoiced - paid,
    unallocated: paid - allocated,
  };
}

/**
 * Kredit limiti yetadimi.
 *
 * `limit === null` — LIMIT SOZLANMAGAN, ya'ni tekshirilmaydi.
 *
 * Sxemadagi eski izoh buni "limit yo'q, faqat oldindan to'lov"
 * deb o'qishga ham yo'l qo'yardi. Shu ma'noda olinsa, BUGUNGI
 * hamma diler (hammasida `null`) buyurtma bera olmay qolardi —
 * ishlayotgan oqim buzilardi (`CLAUDE.md` §30).
 *
 * Haqiqiy siyosat BARFF dan kelmagan (`docs/OPEN-QUESTIONS.md`
 * Q14, Q17), shuning uchun O'YLAB TOPILMAYDI: limit qo'yilgan
 * dilerda tekshiriladi, qo'yilmaganida tekshirilmaydi.
 */
export function creditAvailable(limit: number | null, outstanding: number): number | null {
  if (limit === null) return null;
  return limit - outstanding;
}

export function exceedsCreditLimit(
  limit: number | null,
  outstanding: number,
  orderTotal: number,
): boolean {
  const available = creditAvailable(limit, outstanding);
  if (available === null) return false;

  return orderTotal > available;
}
