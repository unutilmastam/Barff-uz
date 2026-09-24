import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Dizayn tokenlarining kontrast nisbati (WCAG 2.1).
 *
 * Bu test ranglar faylining O'ZINI o'qiydi, shuning uchun tokenni
 * qo'lda "biroz xiraroq" qilib qo'yish darhol ushlanadi. Kontrast —
 * did masalasi emas, o'lchanadigan talab (CLAUDE.md §29).
 *
 * HAR BIR TEKSHIRUV IKKALA KO'RINISHDA bajariladi. Yorug' ko'rinish
 * qo'shilganda bu shart bo'lib qoldi: bir xil xom rang ikkala fonda
 * ishlay olmaydi — masalan `brand-400` qora fonda 9.79:1, oq fonda esa
 * atigi 1.96:1 beradi.
 */

const css = readFileSync(join(__dirname, '..', 'tailwind', 'theme.css'), 'utf8');

type Scheme = 'light' | 'dark';
const SCHEMES: Scheme[] = ['light', 'dark'];

/**
 * Tokenning berilgan ko'rinishdagi qiymati.
 *
 * Token ikki shaklda bo'lishi mumkin:
 *   --x: #aabbcc;                      — ikkala ko'rinishda bir xil
 *   --x: light-dark(#aabbcc, #112233); — yorug'/qorong'i juftligi
 *
 * `light-dark()` ning argument tartibi CSS spetsifikatsiyasida
 * qat'iy: avval YORUG', keyin QORONG'I.
 */
function token(name: string, scheme: Scheme): string {
  const pair = new RegExp(
    `--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`,
  ).exec(css);
  if (pair !== null) {
    return (scheme === 'light' ? pair[1] : pair[2]) as string;
  }

  const plain = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  if (plain !== null) return plain[1] as string;

  throw new Error(`Token topilmadi: --${name}`);
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
/** Grafik element va fokus halqasi uchun (WCAG 1.4.11). */
const AA_NON_TEXT = 3;

const BACKGROUNDS = ['color-ink-900', 'color-ink-800', 'color-ink-700', 'color-ink-600'] as const;
const TEXT_COLORS = ['color-fg', 'color-fg-muted', 'color-fg-subtle'] as const;

describe.each(SCHEMES)('%s ko’rinish', (scheme) => {
  const t = (name: string) => token(name, scheme);

  describe('matn ranglari fon qatlamlarida', () => {
    for (const bg of BACKGROUNDS) {
      for (const fg of TEXT_COLORS) {
        it(`${fg} / ${bg} AA dan o'tadi`, () => {
          expect(contrastRatio(t(fg), t(bg))).toBeGreaterThanOrEqual(AA_NORMAL);
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
    it("asosiy tugma AA dan o'tadi", () => {
      expect(contrastRatio(t('color-accent-on'), t('color-accent'))).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    });

    it("asosiy tugma HOVER holatida ham AA dan o'tadi", () => {
      // Hover fonni O'ZGARTIRADI, matn esa o'sha-o'sha qoladi —
      // shuning uchun u alohida tekshiriladi.
      expect(contrastRatio(t('color-accent-on'), t('color-accent-hover'))).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    });

    it("xavf tugmasi AA dan o'tadi", () => {
      expect(contrastRatio(t('color-danger-on'), t('color-danger'))).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    });
  });

  describe('aksent va holat ranglari', () => {
    it("aksent MATN sahifa fonida AA dan o'tadi", () => {
      // Kichik matn ham bor (masalan bo'lim yorlig'i), shuning uchun
      // yirik matn chegarasi emas, to'liq AA talab qilinadi.
      expect(contrastRatio(t('color-accent-text'), t('color-ink-900'))).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    });

    it('fokus halqasi fondan ajralib turadi', () => {
      expect(contrastRatio(t('color-focus'), t('color-ink-900'))).toBeGreaterThanOrEqual(
        AA_NON_TEXT,
      );
    });

    it("holat ranglari sahifa fonida AA dan o'tadi", () => {
      for (const name of ['color-success', 'color-warning', 'color-danger', 'color-info']) {
        expect(contrastRatio(t(name), t('color-ink-900')), name).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });

    it("holat ranglari kartochka fonida ham AA dan o'tadi", () => {
      // Nishonlar (`Badge`) ko'pincha kartochka ichida turadi.
      for (const name of ['color-success', 'color-warning', 'color-danger', 'color-info']) {
        expect(contrastRatio(t(name), t('color-ink-700')), name).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });

    it('brand-400 qora fonda yirik matn uchun yetarli', () => {
      // Xom palitra tekshiruvi — u ko'rinishga bog'liq emas.
      expect(contrastRatio(token('color-brand-400', 'dark'), '#050607')).toBeGreaterThanOrEqual(
        AA_LARGE,
      );
    });
  });
});

describe('qarorlarni qayd etish', () => {
  it("qorong'ida xavf fonida OQ matn AA dan o'tmaydi — shuning uchun ishlatilmaydi", () => {
    // Bu testning maqsadi — qarorni qayd etish. Kimdir tugmani oq matnga
    // qaytarmoqchi bo'lsa, sabab shu yerda yozilgan.
    expect(contrastRatio(token('color-fg', 'dark'), token('color-danger', 'dark'))).toBeLessThan(
      AA_NORMAL,
    );
  });

  it("yorug'da aksent fonida OQ matn AA dan o'tmaydi — matn QORA qoladi", () => {
    // `accent-on` nega ikkala ko'rinishda ham qora ekanining sababi.
    expect(contrastRatio('#ffffff', token('color-accent', 'light'))).toBeLessThan(AA_NORMAL);
  });
});
