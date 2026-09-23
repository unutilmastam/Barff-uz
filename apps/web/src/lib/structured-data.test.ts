import { describe, expect, it } from 'vitest';
import { type PublicNewsArticle, type PublicProduct } from '@barff/types';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
} from './structured-data';

const L = (t: string) => ({ uz: t, ru: t, en: t });

const product: PublicProduct = {
  id: '1',
  slug: 'anor-sharbati',
  sku: 'ANOR-1',
  name: L('Anor sharbati'),
  description: L('Tabiiy anor sharbati'),
  ingredients: null,
  storage: null,
  flavor: null,
  shelfLifeDays: 180,
  nutrition: null,
  seo: null,
  category: { slug: 'sharbatlar', name: L('Sharbatlar') },
  variants: [],
  images: [],
  documents: [],
};

const article: PublicNewsArticle = {
  id: '1',
  slug: 'yangi-liniya',
  title: L('Yangi liniya'),
  excerpt: L('Qisqa mazmun'),
  body: L('Matn'),
  seo: null,
  publishedAt: '2026-03-01T00:00:00.000Z',
  coverImage: null,
};

/**
 * ENG MUHIM shart: soxta "ishonch belgilari" bo'lmasligi kerak
 * (CLAUDE.md §19). Reyting va sharh qidiruv natijasida yulduzcha
 * bo'lib chiqadi — o'ylab topilgani to'g'ridan-to'g'ri yolg'on.
 */
describe('tuzilgan malumotlar soxta belgilarsiz', () => {
  it('mahsulotda reyting, sharh va taklif YOQ', () => {
    const json = JSON.stringify(productJsonLd(product, 'uz'));

    expect(json).not.toContain('aggregateRating');
    expect(json).not.toContain('review');
    expect(json).not.toContain('offers');
    expect(json).not.toContain('ratingValue');
  });

  it('maqolada reyting YOQ', () => {
    const json = JSON.stringify(articleJsonLd(article, 'uz'));

    expect(json).not.toContain('aggregateRating');
    expect(json).not.toContain('review');
  });
});

describe('productJsonLd', () => {
  it('faktik maydonlarni beradi', () => {
    const data = productJsonLd(product, 'uz');

    expect(data['@type']).toBe('Product');
    expect(data['name']).toBe('Anor sharbati');
    expect(data['sku']).toBe('ANOR-1');
    expect(data['url']).toContain('/uz/products/anor-sharbati');
  });

  it('rasm yoq bolsa `image` kaliti umuman yozilmaydi', () => {
    const data = productJsonLd(product, 'uz');

    // Bo'sh qiymatli kalit "rasm bor, lekin buzuq" degan taassurot
    // qoldirardi — shuning uchun kalit butunlay tushiriladi.
    expect('image' in data).toBe(false);
  });

  it('tavsif bosh bolsa `description` yozilmaydi', () => {
    const data = productJsonLd({ ...product, description: null }, 'uz');

    expect('description' in data).toBe(false);
  });
});

describe('articleJsonLd', () => {
  it('nashr sanasini beradi', () => {
    const data = articleJsonLd(article, 'uz');

    expect(data['@type']).toBe('NewsArticle');
    expect(data['datePublished']).toBe('2026-03-01T00:00:00.000Z');
  });

  it('nashr sanasi yoq bolsa kalit yozilmaydi', () => {
    const data = articleJsonLd({ ...article, publishedAt: null }, 'uz');

    expect('datePublished' in data).toBe(false);
  });

  it('muallif KORSATILMAYDI', () => {
    // Ommaviy javobda muallif ismi yo'q — noto'g'ri muallif
    // ko'rsatgandan ko'ra umuman ko'rsatmagan yaxshi.
    expect('author' in articleJsonLd(article, 'uz')).toBe(false);
  });
});

describe('organizationJsonLd', () => {
  it('kompaniya faktlarini OYLAB TOPMAYDI', () => {
    const data = organizationJsonLd('uz', 'Ichimliklar ishlab chiqaruvchi');
    const json = JSON.stringify(data);

    // Manzil va telefon BARFF tasdiqlagunicha yozilmaydi (Q11).
    expect(json).not.toContain('address');
    expect(json).not.toContain('telephone');
    expect(data['name']).toBe('BARFF');
  });
});

describe('breadcrumbJsonLd', () => {
  it('tartib raqamlari 1 dan boshlanadi', () => {
    const data = breadcrumbJsonLd('ru', [
      { name: 'Bosh sahifa', path: '/' },
      { name: 'Mahsulotlar', path: '/products' },
    ]);

    const items = data['itemListElement'] as { position: number; item: string }[];
    expect(items[0]?.position).toBe(1);
    expect(items[1]?.position).toBe(2);
    expect(items[1]?.item).toContain('/ru/products');
  });
});
