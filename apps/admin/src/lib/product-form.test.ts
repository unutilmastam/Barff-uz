import { describe, expect, it } from 'vitest';
import {
  formatPriceRange,
  formatSom,
  parseSom,
  somInput,
  suggestSku,
  suggestSlug,
  thumbUrl,
  toProductPayload,
  validateProductForm,
  type ProductFormValue,
} from './product-form';

const empty = { uz: '', ru: '', en: '' };
const form = (patch: Partial<ProductFormValue> = {}): ProductFormValue => ({
  slug: 'olma-sharbati',
  sku: 'OLMA',
  categoryId: 'c1',
  name: { uz: 'Olma sharbati', ru: '', en: '' },
  description: empty,
  ingredients: empty,
  storage: empty,
  flavor: empty,
  shelfLifeDays: '',
  displayOrder: '',
  isActive: false,
  ...patch,
});

describe('parseSom', () => {
  it.each([
    ['18000', 1_800_000],
    ['18 000', 1_800_000],
    ['18 000,50', 1_800_050],
    ['18000.5', 1_800_050],
    ['0', 0],
    ['0.07', 7],
    ['1.15', 115],
  ])('%s -> %i tiyin', (text, expected) => {
    expect(parseSom(text)).toBe(expected);
  });

  it.each(['', ' ', '-5', 'abc', '12.345', '1,2,3', '12 so‘m'])('%j rad etiladi', (text) => {
    expect(parseSom(text)).toBeNull();
  });

  it('somInput bilan aylanib keladi', () => {
    for (const amount of [0, 7, 100, 115, 1_800_000, 1_800_050, 1_800_005]) {
      expect(parseSom(somInput(amount))).toBe(amount);
    }
  });
});

/** `@barff/utils` mingliklarni ingichka bo'shliq (U+202F) bilan ajratadi. */
const NB = '\u202f';

describe('ko‘rsatish', () => {
  it('butun so‘mda tiyin ko‘rsatilmaydi', () => {
    expect(formatSom(1_800_000)).toBe(`18${NB}000 so'm`);
    expect(formatSom(null)).toBe('—');
  });

  it('narx oralig‘i', () => {
    expect(formatPriceRange(1_800_000, 1_800_000)).toBe(`18${NB}000 so'm`);
    expect(formatPriceRange(1_800_000, 9_000_000)).toBe(`18${NB}000 so'm — 90${NB}000 so'm`);
    expect(formatPriceRange(null, null)).toBe('—');
  });
});

describe('takliflar', () => {
  it('slug o‘zbekcha nomdan', () => {
    expect(suggestSlug({ uz: 'Apelsin sharbati 1 L', ru: '', en: '' })).toBe(
      'apelsin-sharbati-1-l',
    );
    expect(suggestSlug({ uz: '', ru: 'Яблочный сок', en: '' })).toBe('yablochnyy-sok');
  });

  it('SKU katta harfda', () => {
    expect(suggestSku('olma-1l')).toBe('OLMA-1L');
  });
});

describe('toProductPayload / validateProductForm', () => {
  it('bo‘sh ixtiyoriy maydonlar yuborilmaydi, raqamlar son bo‘ladi', () => {
    const payload = toProductPayload(form({ shelfLifeDays: '180', displayOrder: '3' }));

    expect(payload).toEqual({
      slug: 'olma-sharbati',
      sku: 'OLMA',
      categoryId: 'c1',
      name: { uz: 'Olma sharbati' },
      shelfLifeDays: 180,
      displayOrder: 3,
      isActive: false,
    });
  });

  it('kategoriyasiz, nomsiz, yomon muddatli forma rad etiladi', () => {
    expect(validateProductForm(form({ categoryId: '' }))).toMatch(/Kategoriya/);
    expect(validateProductForm(form({ name: empty }))).toMatch(/Nomini/);
    expect(validateProductForm(form({ shelfLifeDays: '0' }))).toMatch(/Yaroqlilik/);
    expect(validateProductForm(form({ shelfLifeDays: '1.5' }))).toMatch(/Yaroqlilik/);
    expect(validateProductForm(form())).toBeNull();
  });
});

describe('thumbUrl', () => {
  const image = (sources: { width: number; format: string; url: string }[]) => ({
    id: 'i',
    width: 1,
    height: 1,
    blurDataUrl: null,
    alt: null,
    sources: sources.map((s) => ({ label: `${s.width}w`, ...s })),
  });

  it('eng kichik webp ni tanlaydi', () => {
    expect(
      thumbUrl(
        image([
          { width: 1200, format: 'webp', url: 'big' },
          { width: 320, format: 'avif', url: 'avif' },
          { width: 320, format: 'webp', url: 'small' },
        ]),
      ),
    ).toBe('small');
  });

  it('rasm yo‘q bo‘lsa null', () => {
    expect(thumbUrl(null)).toBeNull();
    expect(thumbUrl(image([]))).toBeNull();
  });
});
