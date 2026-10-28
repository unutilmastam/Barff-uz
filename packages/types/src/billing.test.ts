import { describe, expect, it } from 'vitest';
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_TRANSITIONS,
  canTransitionInvoice,
  creditAvailable,
  dealerBalance,
  exceedsCreditLimit,
  invoiceOutstanding,
  invoiceStatusFor,
} from './billing';

describe('hisob-faktura holati', () => {
  /**
   * HOLAT TAQSIMOTDAN KELIB CHIQADI.
   *
   * Uni qo'lda qo'yish imkoni bo'lsa, "to'landi" deb belgilangan,
   * lekin pul kelmagan hisob-faktura paydo bo'lardi.
   */
  it('taqsimot yoq — BERILGAN', () => {
    expect(invoiceStatusFor(100_000, 0)).toBe('ISSUED');
  });

  it('qisman taqsimot — QISMAN TOLANGAN', () => {
    expect(invoiceStatusFor(100_000, 1)).toBe('PARTIALLY_PAID');
    expect(invoiceStatusFor(100_000, 99_999)).toBe('PARTIALLY_PAID');
  });

  it('toliq taqsimot — TOLANGAN', () => {
    expect(invoiceStatusFor(100_000, 100_000)).toBe('PAID');
  });

  /** Ortiqcha taqsimot ham TO'LANGAN — "110% to'landi" degan holat yo'q. */
  it('ortiqcha taqsimot ham TOLANGAN', () => {
    expect(invoiceStatusFor(100_000, 150_000)).toBe('PAID');
  });

  it('qolgan qarz MANFIY bolmaydi', () => {
    expect(invoiceOutstanding(100_000, 150_000)).toBe(0);
    expect(invoiceOutstanding(100_000, 40_000)).toBe(60_000);
  });
});

describe('hisob-faktura otishlari', () => {
  /**
   * `PARTIALLY_PAID` va `PAID` ga QO'LDA o'tib bo'lmaydi: ular
   * to'lovdan kelib chiqadi.
   */
  it('TOLANGAN ga qolda otib bolmaydi', () => {
    for (const from of INVOICE_STATUSES) {
      expect(canTransitionInvoice(from, 'PAID'), from).toBe(false);
      expect(canTransitionInvoice(from, 'PARTIALLY_PAID'), from).toBe(false);
    }
  });

  it('QORALAMA dan BERILGAN ga otiladi', () => {
    expect(canTransitionInvoice('DRAFT', 'ISSUED')).toBe(true);
  });

  /** Berilgan hujjatni qoralamaga qaytarish — dilerdagi qog'ozdan ajralish. */
  it('BERILGAN dan QORALAMA ga QAYTIB bolmaydi', () => {
    expect(canTransitionInvoice('ISSUED', 'DRAFT')).toBe(false);
  });

  it('yakuniy holatlardan chiqib bolmaydi', () => {
    expect(INVOICE_STATUS_TRANSITIONS.PAID).toEqual([]);
    expect(INVOICE_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('bekor qilish BERILGAN va QISMAN TOLANGAN dan mumkin', () => {
    expect(canTransitionInvoice('ISSUED', 'CANCELLED')).toBe(true);
    expect(canTransitionInvoice('PARTIALLY_PAID', 'CANCELLED')).toBe(true);
  });
});

describe('diler balansi', () => {
  it('qarz — AYIRMA', () => {
    const balance = dealerBalance(500_000, 200_000, 200_000);

    expect(balance.outstanding).toBe(300_000);
    expect(balance.unallocated).toBe(0);
  });

  /** Oldindan to'lov — MANFIY qarz. Bu xato emas, diler foydasiga qoldiq. */
  it('oldindan tolov MANFIY qarz beradi', () => {
    const balance = dealerBalance(100_000, 300_000, 100_000);

    expect(balance.outstanding).toBe(-200_000);
    expect(balance.unallocated).toBe(200_000);
  });

  it('taqsimlanmagan tolov — kelgan va taqsimlangan farqi', () => {
    const balance = dealerBalance(500_000, 400_000, 150_000);

    expect(balance.unallocated).toBe(250_000);
  });
});

describe('kredit limiti', () => {
  /**
   * LIMIT SOZLANMAGAN BO'LSA TEKSHIRILMAYDI.
   *
   * `null` ni "kredit yo'q" deb o'qish bugungi HAMMA dilerni
   * bloklab qo'yardi: hammasida `null` (`docs/BILLING-POLICY.md` §4).
   */
  it('limit sozlanmagan — tekshirilmaydi', () => {
    expect(creditAvailable(null, 10_000_000)).toBeNull();
    expect(exceedsCreditLimit(null, 10_000_000, 5_000_000)).toBe(false);
  });

  it('limitdan oshgan buyurtma BLOKLANADI', () => {
    expect(exceedsCreditLimit(1_000_000, 600_000, 500_000)).toBe(true);
  });

  it('limitga TENG buyurtma otadi', () => {
    // Aynan chegara — `>` bilan `>=` farqi shu yerda ko'rinadi.
    expect(exceedsCreditLimit(1_000_000, 600_000, 400_000)).toBe(false);
  });

  it('limit toshib ketgan bolsa yangi buyurtma otmaydi', () => {
    expect(creditAvailable(1_000_000, 1_500_000)).toBe(-500_000);
    expect(exceedsCreditLimit(1_000_000, 1_500_000, 1)).toBe(true);
  });

  /** Nol limitda faqat nol summali buyurtma o'tadi — ya'ni amalda hech qaysi. */
  it('nol limit — kredit yoq', () => {
    expect(exceedsCreditLimit(0, 0, 1)).toBe(true);
    expect(exceedsCreditLimit(0, 0, 0)).toBe(false);
  });
});
