import { describe, expect, it } from 'vitest';
import {
  addMoney,
  applyPercentDiscount,
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
