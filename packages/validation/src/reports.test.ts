import { describe, expect, it } from 'vitest';
import { reportKeySchema, reportQuerySchema } from './reports';

describe('hisobot so‘rovi', () => {
  it('oddiy oraliq qabul qilinadi', () => {
    expect(reportQuerySchema.safeParse({ from: '2031-03-10', to: '2031-03-12' }).success).toBe(
      true,
    );
  });

  it('bitta sana yoki bosh so‘rov qabul qilinadi', () => {
    expect(reportQuerySchema.safeParse({ from: '2031-03-10' }).success).toBe(true);
    expect(reportQuerySchema.safeParse({}).success).toBe(true);
  });

  /**
   * REGRESSIYA (S37 sinovi topgan xato).
   *
   * Zod `refine` larni birinchisi yiqilsa ham KETMA-KET bajaradi.
   * Ikkinchisi yaroqsiz sanada `new Date(NaN).toISOString()` da
   * `RangeError` tashlardi va API `400` o'rniga `500` qaytarardi.
   * Endi `safeParse` HECH QACHON ISTISNO TASHLAMASLIGI kerak.
   */
  it.each(['2031-02-31', '2031-13-01', '2031-00-10', '2031-04-31', '9999-99-99', 'kecha', ''])(
    '%j yaroqsiz sana ISTISNO TASHLAMAYDI, xato qaytaradi',
    (value) => {
      expect(() => reportQuerySchema.safeParse({ from: value })).not.toThrow();
      expect(reportQuerySchema.safeParse({ from: value }).success).toBe(false);
    },
  );

  /** `2028-02-29` — kabisa yili, u MAVJUD; `2031-02-29` esa yo'q. */
  it('kabisa yili 29-fevral', () => {
    expect(reportQuerySchema.safeParse({ from: '2028-02-29' }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ from: '2031-02-29' }).success).toBe(false);
  });

  it('vaqtli sana rad etiladi: «gacha» yarim kunni kesib tashlardi', () => {
    expect(reportQuerySchema.safeParse({ to: '2031-03-10T10:00:00Z' }).success).toBe(false);
  });

  it('«dan» «gacha» dan keyin bo‘lsa — rad etiladi, teng bo‘lsa — yo‘q', () => {
    expect(reportQuerySchema.safeParse({ from: '2031-03-12', to: '2031-03-10' }).success).toBe(
      false,
    );
    expect(reportQuerySchema.safeParse({ from: '2031-03-10', to: '2031-03-10' }).success).toBe(
      true,
    );
  });

  it('limit chegarasi', () => {
    expect(reportQuerySchema.safeParse({ limit: '5000' }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ limit: '5001' }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('dealerId UUID bo‘lishi shart', () => {
    expect(reportQuerySchema.safeParse({ dealerId: 'abc' }).success).toBe(false);
  });

  it('hisobot kaliti faqat ro‘yxatdagi', () => {
    expect(reportKeySchema.safeParse('sales').success).toBe(true);
    expect(reportKeySchema.safeParse('drop-table').success).toBe(false);
  });
});
