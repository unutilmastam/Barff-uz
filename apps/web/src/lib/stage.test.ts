import { type PublicProduct } from '@barff/types';
import { describe, expect, it } from 'vitest';
import { stageItems } from './stage';

const product = (slug: string, volumeMl: number): PublicProduct =>
  ({
    id: slug,
    slug,
    sku: slug.toUpperCase(),
    name: { uz: `Nom ${slug}`, ru: `Имя ${slug}`, en: `Name ${slug}` },
    variants: [{ id: `${slug}-v`, sku: slug, volumeMl, unitsPerPack: null, price: null }],
    images: [],
  }) as unknown as PublicProduct;

describe('stageItems', () => {
  it('har bir ta’mdan BITTA, 350 ml afzal (1 L oldin kelsa ham)', () => {
    const items = stageItems(
      [
        product('olcha-sharbati-1l', 1000),
        product('olcha-sharbati-350', 350),
        product('mango-sharbati-350', 350),
        product('mango-sharbati-1l', 1000),
      ],
      'uz',
    );

    expect(items.map((item) => item.slug)).toEqual(['olcha-sharbati-350', 'mango-sharbati-350']);
  });

  it('kesilgan surati YO‘Q mahsulot sahnaga tushmaydi (admin yangi qo‘shgan)', () => {
    const items = stageItems(
      [product('yangi-mahsulot-350', 350), product('anor-sharbati-350', 350)],
      'uz',
    );
    expect(items.map((item) => item.slug)).toEqual(['anor-sharbati-350']);
  });

  it('til bo‘yicha nom va mahsulot sahifasiga havola', () => {
    const [item] = stageItems([product('olma-sharbati-350', 350)], 'ru');
    expect(item?.name).toBe('Имя olma-sharbati-350');
    expect(item?.href).toBe('/ru/products/olma-sharbati-350');
    expect(item?.glow).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('eng ko‘pi `max` ta', () => {
    const slugs = [
      'anor',
      'olma',
      'olcha',
      'mango',
      'shaftoli',
      'apelsin',
      'qulupnay-ananas',
      'multifrukt',
    ];
    const items = stageItems(
      slugs.map((s) => product(`${s}-sharbati-350`, 350)),
      'uz',
      5,
    );
    expect(items).toHaveLength(5);
  });
});
