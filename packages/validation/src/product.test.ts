import { describe, expect, it } from 'vitest';
import {
  barcodeSchema,
  productCreateSchema,
  productPriceCreateSchema,
  productVariantCreateSchema,
  skuSchema,
  slugSchema,
} from './product';

describe('slugSchema', () => {
  it("to'g'ri slug'ni qabul qiladi", () => {
    for (const value of ['anor', 'anor-sharbati', 'cola-1l', 'a1']) {
      expect(slugSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it('katta harfni kichikka keltiradi', () => {
    expect(slugSchema.parse('Anor-Sharbati')).toBe('anor-sharbati');
  });

  it('bosh va oxirgi defisni rad etadi', () => {
    // Bunday slug bir xil sahifaga bir nechta manzil yaratardi.
    expect(slugSchema.safeParse('-anor').success).toBe(false);
    expect(slugSchema.safeParse('anor-').success).toBe(false);
  });

  it('ketma-ket defisni rad etadi', () => {
    expect(slugSchema.safeParse('anor--sharbati').success).toBe(false);
  });

  it('probel va maxsus belgilarni rad etadi', () => {
    for (const value of ['anor sharbati', 'anor_sharbati', 'anor/sharbati', 'anor.1']) {
      expect(slugSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it('kirill harflarini rad etadi', () => {
    expect(slugSchema.safeParse('анор').success).toBe(false);
  });

  it('juda qisqa slugni rad etadi', () => {
    expect(slugSchema.safeParse('a').success).toBe(false);
  });
});

describe('skuSchema', () => {
  it('katta harfga keltiradi', () => {
    expect(skuSchema.parse('anr-500')).toBe('ANR-500');
  });

  it('probelli SKU ni rad etadi', () => {
    expect(skuSchema.safeParse('ANR 500').success).toBe(false);
  });

  it('defis bilan boshlanishini rad etadi', () => {
    expect(skuSchema.safeParse('-ANR').success).toBe(false);
  });
});

describe('barcodeSchema', () => {
  it('EAN-13, EAN-8 va UPC-A ni qabul qiladi', () => {
    expect(barcodeSchema.safeParse('4780012345678').success).toBe(true);
    expect(barcodeSchema.safeParse('47800123').success).toBe(true);
    expect(barcodeSchema.safeParse('478001234567').success).toBe(true);
  });

  it("noto'g'ri uzunlikni rad etadi", () => {
    for (const value of ['123', '1234567890', '12345678901234']) {
      expect(barcodeSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it('harf aralashgan kodni rad etadi', () => {
    expect(barcodeSchema.safeParse('478001234567A').success).toBe(false);
  });
});

const validProduct = {
  slug: 'anor-sharbati',
  sku: 'ANR-500',
  categoryId: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
  name: { uz: 'Anor sharbati', ru: 'Гранатовый сок', en: 'Pomegranate juice' },
};

describe('productCreateSchema', () => {
  it('minimal mahsulotni qabul qiladi', () => {
    const parsed = productCreateSchema.parse(validProduct);
    expect(parsed.isActive).toBe(true);
    expect(parsed.displayOrder).toBe(0);
  });

  /**
   * QISMAN tarjima QABUL QILINADI.
   *
   * Avval uchala til ham majburiy edi, sabab shunday izohlangandi:
   * "tarjimasiz mahsulot saytda bo'sh sarlavha bilan chiqardi". Bu
   * endi TO'G'RI EMAS — S12 dagi `text()` yordamchisi tarjimasi yo'q
   * tilda boshqa tildagi matnni ko'rsatadi.
   *
   * Uchala tilni talab qilish esa haqiqiy oqimni bloklardi: muharrir
   * o'zbekcha yozadi, tarjimon ruschasini keyinroq qo'shadi.
   */
  it('qisman tarjimani qabul qiladi', () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      name: { uz: 'Anor', ru: 'Гранат' },
    });

    expect(result.success).toBe(true);
  });

  it("bo'sh tarjimalarni OLIB TASHLAYDI", () => {
    const parsed = productCreateSchema.parse({
      ...validProduct,
      name: { uz: 'Anor', ru: '', en: '' },
    });

    // "Tarjima bor, lekin bo'sh" degan chalkash holat qolmasligi kerak.
    expect(parsed.name).toEqual({ uz: 'Anor' });
  });

  it('hech bir tilda matn bolmasa RAD ETADI', () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      name: { uz: '', ru: '', en: '' },
    });

    expect(result.success).toBe(false);
  });

  it("noto'g'ri kategoriya id sini rad etadi", () => {
    expect(productCreateSchema.safeParse({ ...validProduct, categoryId: '123' }).success).toBe(
      false,
    );
  });

  it('haddan tashqari uzun yaroqlilik muddatini rad etadi', () => {
    expect(productCreateSchema.safeParse({ ...validProduct, shelfLifeDays: 4000 }).success).toBe(
      false,
    );
  });

  it('nolga teng yaroqlilik muddatini rad etadi', () => {
    expect(productCreateSchema.safeParse({ ...validProduct, shelfLifeDays: 0 }).success).toBe(
      false,
    );
  });

  it('SEO tavsifi uzunligini cheklaydi', () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      seo: { description: { uz: 'x'.repeat(200), ru: 'x', en: 'x' } },
    });
    expect(result.success).toBe(false);
  });
});

describe('productVariantCreateSchema', () => {
  it('hajmni millilitrda qabul qiladi', () => {
    expect(productVariantCreateSchema.parse({ sku: 'ANR-500', volumeMl: 500 }).volumeMl).toBe(500);
  });

  it('kasr hajmni rad etadi', () => {
    // 0.5 l -> 500 ml deb yozilishi kerak, `0.5` emas.
    expect(productVariantCreateSchema.safeParse({ sku: 'X', volumeMl: 0.5 }).success).toBe(false);
  });

  it('nol yoki manfiy hajmni rad etadi', () => {
    expect(productVariantCreateSchema.safeParse({ sku: 'X1', volumeMl: 0 }).success).toBe(false);
    expect(productVariantCreateSchema.safeParse({ sku: 'X1', volumeMl: -1 }).success).toBe(false);
  });
});

describe('productPriceCreateSchema', () => {
  it('butun tiyinni qabul qiladi', () => {
    expect(productPriceCreateSchema.parse({ amount: 1_250_000 }).amount).toBe(1_250_000);
  });

  it('kasr summani rad etadi', () => {
    // Suzuvchi nuqta yig'indida xato to'playdi (CLAUDE.md).
    const result = productPriceCreateSchema.safeParse({ amount: 12.5 });
    expect(result.success).toBe(false);
  });

  it('manfiy narxni rad etadi', () => {
    expect(productPriceCreateSchema.safeParse({ amount: -1 }).success).toBe(false);
  });

  it('valyutani katta harfga keltiradi va 3 belgiga cheklaydi', () => {
    expect(productPriceCreateSchema.parse({ amount: 100, currency: 'uzs' }).currency).toBe('UZS');
    expect(productPriceCreateSchema.safeParse({ amount: 100, currency: 'UZSS' }).success).toBe(
      false,
    );
  });

  it('standart valyuta UZS', () => {
    expect(productPriceCreateSchema.parse({ amount: 100 }).currency).toBe('UZS');
  });
});
