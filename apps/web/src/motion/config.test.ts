import { describe, expect, it } from 'vitest';
import { DURATION, REVEAL_DISTANCE, REVEAL_START, STAGGER } from './config';

/**
 * Harakat sozlamalari CSS token'lari bilan MOS bo'lishi kerak.
 *
 * `theme.css` dagi `--duration-*` millisekundda, bu yerdagi qiymatlar
 * esa soniyada (GSAP shunday ishlaydi). Ikkisi ajralib ketsa, sayt
 * bo'ylab harakat bir ritmda bo'lmay qoladi — CSS o'tishi 320ms,
 * GSAP animatsiyasi esa boshqa tezlikda ishlardi.
 */
describe('harakat sozlamalari', () => {
  it('davomiyliklar CSS token qiymatlariga teng', () => {
    expect(DURATION.fast * 1000).toBe(180);
    expect(DURATION.base * 1000).toBe(320);
    expect(DURATION.slow * 1000).toBe(720);
  });

  it('ochilish ekranning pastki qismida boshlanadi', () => {
    // Kechroq bo'lsa, foydalanuvchi bo'sh joyni ko'rib ulguradi.
    expect(REVEAL_START).toBe('top 85%');
  });

  it('siljish masofasi kichik — makon surilishi bolmasligi uchun', () => {
    // Faqat `transform` ishlatiladi, lekin katta masofa baribir
    // e'tiborni tortadi va "sakragandek" ko'rinadi.
    expect(REVEAL_DISTANCE).toBeLessThanOrEqual(32);
    expect(REVEAL_DISTANCE).toBeGreaterThan(0);
  });

  it('ketma-ketlik kechikishi seziladi, lekin kutdirmaydi', () => {
    expect(STAGGER).toBeGreaterThan(0.03);
    expect(STAGGER).toBeLessThan(0.15);
  });
});
