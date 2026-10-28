import { describe, expect, it } from 'vitest';
import { placeItem, snapIndex, toStyle, wrapOffset } from './carousel';

describe('3D karusel hisobi', () => {
  it('oldidagi shisha: markazda, to‘liq o‘lcham va yorqinlikda', () => {
    const p = placeItem(0, 8, 400);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(0);
    expect(p.scale).toBeCloseTo(1);
    expect(p.opacity).toBeCloseTo(1);
    expect(p.brightness).toBeCloseTo(1);
    expect(p.glow).toBe(1);
    expect(p.zIndex).toBe(100);
  });

  it('qo‘shnilar simmetrik: chap va o‘ng bir xil, faqat ishora teskari', () => {
    const left = placeItem(-1, 8, 400);
    const right = placeItem(1, 8, 400);
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.rotate).toBeCloseTo(-right.rotate);
    expect(left.scale).toBeCloseTo(right.scale);
    expect(left.z).toBeCloseTo(right.z);
  });

  it('orqadagi shisha kichik, xira, qorong‘i va oldingining orqasida', () => {
    const front = placeItem(0, 8, 400);
    const back = placeItem(4, 8, 400);
    expect(back.scale).toBeLessThan(front.scale);
    expect(back.opacity).toBeLessThan(0.2);
    expect(back.brightness).toBeLessThan(front.brightness);
    expect(back.zIndex).toBeLessThan(front.zIndex);
    expect(back.z).toBeLessThan(0);
  });

  it('chuqurlik bo‘yicha monoton: uzoqlashgan sari kichrayadi', () => {
    const scales = [0, 1, 2, 3, 4].map((o) => placeItem(o, 8, 400).scale);
    for (let i = 1; i < scales.length; i += 1) expect(scales[i]).toBeLessThan(scales[i - 1] ?? 0);
  });

  it('yorug‘lik vazni faqat oldidagi va qo‘shni oralig‘ida o‘tadi', () => {
    expect(placeItem(0.5, 8, 400).glow).toBeCloseTo(0.5);
    expect(placeItem(1, 8, 400).glow).toBe(0);
    expect(placeItem(3, 8, 400).glow).toBe(0);
  });

  it('wrapOffset: aylana bo‘ylab eng qisqa yo‘l', () => {
    expect(wrapOffset(0, 0, 8)).toBe(0);
    expect(wrapOffset(7, 0, 8)).toBe(-1);
    expect(wrapOffset(1, 7, 8)).toBe(2);
    expect(wrapOffset(0, 7.5, 8)).toBeCloseTo(0.5);
    // Hech qachon count/2 dan oshmaydi.
    for (let i = 0; i < 8; i += 1) expect(Math.abs(wrapOffset(i, 3.3, 8))).toBeLessThanOrEqual(4);
  });

  it('snapIndex manfiy va katta qiymatlarda ham 0..count-1 beradi', () => {
    expect(snapIndex(-1, 8)).toBe(7);
    expect(snapIndex(8.4, 8)).toBe(0);
    expect(snapIndex(2.6, 8)).toBe(3);
  });

  it('toStyle: serverda va brauzerda bir xil satr (gidratsiya)', () => {
    const a = toStyle(placeItem(1, 8, 400));
    const b = toStyle(placeItem(1, 8, 400));
    expect(a).toEqual(b);
    expect(a.transform).toMatch(/^translate3d\(-?\d+\.\d{3}px, 0, -?\d+\.\d{3}px\) rotateY/);
  });
});
