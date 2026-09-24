import { describe, expect, it } from 'vitest';
import {
  addMoney,
  applyPercentDiscount,
  formatMoney,
  fromMajor,
  money,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toMajor,
} from './money';

describe('pul', () => {
  it('kasr miqdorni rad etadi — tiyin butun son', () => {
    expect(() => money(10.5)).toThrow(TypeError);
  });

  it('so’m va tiyin orasida aniq o’giradi', () => {
    expect(fromMajor(12_500.5).amount).toBe(1_250_050);
    expect(toMajor(money(1_250_050))).toBe(12_500.5);
  });

  it('kasr xatosi to’planmaydi', () => {
    // 0.1 + 0.2 !== 0.3 muammosi butun sonlarda yo'q.
    const total = addMoney(fromMajor(0.1), fromMajor(0.2));
    expect(total.amount).toBe(30);
    expect(toMajor(total)).toBe(0.3);
  });

  it('qo’shadi, ayiradi, ko’paytiradi', () => {
    expect(addMoney(money(100), money(250)).amount).toBe(350);
    expect(subtractMoney(money(500), money(200)).amount).toBe(300);
    expect(multiplyMoney(money(1500), 12).amount).toBe(18_000);
  });

  it('valyutalar mos kelmasa xato beradi', () => {
    const other = { amount: 100, currency: 'USD' } as unknown as ReturnType<typeof money>;
    expect(() => addMoney(money(100), other)).toThrow(TypeError);
  });

  it('kasr miqdorga ko’paytirishni rad etadi', () => {
    expect(() => multiplyMoney(money(100), 1.5)).toThrow(TypeError);
  });

  it('chegirmani pastga yaxlitlaydi', () => {
    // 1001 ning 10% i = 100.1 -> chegirma 100, qoldi 901
    expect(applyPercentDiscount(money(1001), 10).amount).toBe(901);
    expect(applyPercentDiscount(money(1000), 0).amount).toBe(1000);
    expect(applyPercentDiscount(money(1000), 100).amount).toBe(0);
  });

  it('chegirma oralig’dan chiqsa xato beradi', () => {
    expect(() => applyPercentDiscount(money(100), -1)).toThrow(RangeError);
    expect(() => applyPercentDiscount(money(100), 101)).toThrow(RangeError);
  });

  it('bo’sh ro’yxat yig’indisi nol', () => {
    expect(sumMoney([]).amount).toBe(0);
    expect(sumMoney([money(100), money(250), money(3)]).amount).toBe(353);
  });
});

describe('formatMoney', () => {
  /**
   * NATIJA MUHITGA BOG'LIQ BO'LMASLIGI KERAK.
   *
   * `Intl` UZS uchun Node'da `900 soʻm`, Chromium'da `UZS 900`
   * beradi; oddiy `NumberFormat` ham Node'da `18 000`, Chromium'da
   * `18,000`. Ikkalasi ham O'LCHAB tekshirilgan.
   *
   * Server va brauzer bir xil narxni turlicha chizsa, React
   * gidratsiya nomuvofiqligini beradi va mijoz "narx boshqacha"
   * deb o'ylaydi. Shuning uchun format QO'LDA va bu testlar uni
   * qulflaydi.
   */
  const NBSP = '\u202f';

  it("valyuta yorlig'i QO'LDA qo'yiladi", () => {
    expect(formatMoney(money(90_000_00), 'uz-UZ', 0)).toContain("so'm");
    expect(formatMoney(money(90_000_00), 'uz-UZ', 0)).not.toContain('UZS');
  });

  it('mingliklar TOR AJRALMAS BO‘SHLIQ bilan ajratiladi', () => {
    expect(formatMoney(money(18_000_00), 'uz-UZ', 0)).toBe(`18${NBSP}000 so'm`);
    expect(formatMoney(money(1_234_567_00), 'uz-UZ', 0)).toBe(`1${NBSP}234${NBSP}567 so'm`);
  });

  it('vergul ham, nuqta ham AJRATGICH sifatida ishlatilmaydi', () => {
    // Aynan shu ikkisi muhitga qarab paydo bo'lardi.
    const formatted = formatMoney(money(18_000_00), 'uz-UZ', 0);
    expect(formatted).not.toContain(',');
    expect(formatted).not.toContain('.');
  });

  it('tiyin ko‘rsatiladi yoki yashiriladi', () => {
    expect(formatMoney(money(1_250_050), 'uz-UZ', 2)).toBe(`12${NBSP}500,50 so'm`);
    // Yaxlitlash: 50 tiyin -> yuqoriga.
    expect(formatMoney(money(1_250_050), 'uz-UZ', 0)).toBe(`12${NBSP}501 so'm`);
    expect(formatMoney(money(1_250_049), 'uz-UZ', 0)).toBe(`12${NBSP}500 so'm`);
  });

  it('kichik summalar ajratgichsiz', () => {
    expect(formatMoney(money(90_000), 'uz-UZ', 0)).toBe("900 so'm");
    expect(formatMoney(money(0), 'uz-UZ', 0)).toBe("0 so'm");
  });

  it('manfiy summa ishorasini saqlaydi', () => {
    expect(formatMoney(money(-18_000_00), 'uz-UZ', 0)).toBe(`-18${NBSP}000 so'm`);
  });

  it("noma'lum valyuta uchun kodning O'ZI ishlatiladi", () => {
    expect(formatMoney({ amount: 100, currency: 'EUR' as never }, 'uz-UZ', 0)).toContain('EUR');
  });
});
