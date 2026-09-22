import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Dizayn tokenlarining kontrast nisbati (WCAG 2.1).
 *
 * Bu test ranglar faylining O'ZINI o'qiydi, shuning uchun tokenni
 * qo'lda "biroz xiraroq" qilib qo'yish darhol ushlanadi. Kontrast —
 * did masalasi emas, o'lchanadigan talab (CLAUDE.md §29).
 */

const css = readFileSync(join(__dirname, '..', 'tailwind', 'theme.css'), 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (match === null) throw new Error(`Token topilmadi: --${name}`);
  return match[1] as string;
}

function channel(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Oddiy matn uchun AA chegarasi. */
const AA_NORMAL = 4.5;
/** Yirik matn (18.66px+ qalin yoki 24px+) uchun AA chegarasi. */
const AA_LARGE = 3;

const BACKGROUNDS = ['color-ink-900', 'color-ink-800', 'color-ink-700'] as const;
const TEXT_COLORS = ['color-fg', 'color-fg-muted', 'color-fg-subtle'] as const;

describe('matn ranglari fon qatlamlarida', () => {
  for (const bg of BACKGROUNDS) {
    for (const fg of TEXT_COLORS) {
      it(`${fg} / ${bg} AA dan o'tadi`, () => {
        const ratio = contrastRatio(token(fg), token(bg));
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
      });
    }
  }
});

/**
 * Tugmalarning MATN/FON juftliklari.
 *
 * Bu blok keyinroq qo'shildi: dastlabki test faqat "matn qorong'i fon
 * ustida" holatini qoplagan edi va `danger` tugmasidagi oq matn (3.85:1)
 * e'tibordan chetda qolgandi — uni brauzerda ishlagan axe topdi.
 */
describe('tugma matn/fon juftliklari', () => {
  const pairs = [
    { name: 'primary', fg: 'color-ink-900', bg: 'color-brand-500' },
    { name: 'danger', fg: 'color-ink-900', bg: 'color-danger' },
  ] as const;

  for (const pair of pairs) {
    it(`${pair.name} tugmasi AA dan o'tadi`, () => {
      expect(contrastRatio(token(pair.fg), token(pair.bg))).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }

  it("danger fonida OQ matn AA dan o'tmaydi — shuning uchun ishlatilmaydi", () => {
    // Bu testning maqsadi — qarorni qayd etish. Kimdir tugmani oq matnga
    // qaytarmoqchi bo'lsa, sabab shu yerda yozilgan.
    expect(contrastRatio(token('color-fg'), token('color-danger'))).toBeLessThan(AA_NORMAL);
  });
});

describe('aksent ranglari', () => {
  it('brand-400 qora fonda yirik matn uchun yetarli', () => {
    expect(contrastRatio(token('color-brand-400'), token('color-ink-900'))).toBeGreaterThanOrEqual(
      AA_LARGE,
    );
  });

  it('brand-500 tugmasidagi qora matn AA dan o’tadi', () => {
    // Asosiy CTA: yashil fon + qora matn.
    expect(contrastRatio(token('color-ink-900'), token('color-brand-500'))).toBeGreaterThanOrEqual(
      AA_NORMAL,
    );
  });

  it('holat ranglari qora fonda yirik matn uchun yetarli', () => {
    for (const name of ['color-success', 'color-warning', 'color-danger', 'color-info']) {
      expect(contrastRatio(token(name), token('color-ink-900'))).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});
