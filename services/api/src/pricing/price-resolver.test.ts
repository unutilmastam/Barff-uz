import { describe, expect, it } from 'vitest';
import {
  type PriceContext,
  type PriceRuleInput,
  type PriceRuleKind,
  resolvePrice,
} from './price-resolver';

/**
 * Narx dvigateli — USTUNLIK holatlari.
 *
 * Bu testlar sof funksiyani sinaydi, ya'ni har bir holat arzon va
 * aniq. Narx biznesning eng nozik qismi: xato bu yerda emas,
 * hisob-fakturada ko'rinardi.
 */

const VARIANT = 'v-1';
const PRODUCT = 'p-1';
const CATEGORY = 'c-1';
const DEALER = 'd-1';
const TIER = 't-1';

let seq = 0;

function rule(overrides: Partial<PriceRuleInput> = {}): PriceRuleInput {
  seq += 1;

  return {
    id: `r-${String(seq).padStart(3, '0')}`,
    name: `Qoida ${seq}`,
    kind: 'PERCENT_DISCOUNT' as PriceRuleKind,
    amount: 1000,
    variantId: null,
    productId: null,
    categoryId: null,
    dealerId: null,
    tierId: null,
    region: null,
    minQuantity: 1,
    code: null,
    priority: 0,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function ctx(overrides: Partial<PriceContext> = {}): PriceContext {
  return {
    variantId: VARIANT,
    productId: PRODUCT,
    categoryId: CATEGORY,
    quantity: 1,
    dealer: { id: DEALER, tierId: TIER, region: 'Toshkent', tierDiscountBasisPoints: 0 },
    ...overrides,
  };
}

const BASE = 100_000; // 1000 so'm tiyinda

describe('qamrov: mos kelish', () => {
  it("qamrovi bo'sh qoida HAMMAGA tegishli", () => {
    const result = resolvePrice(BASE, [rule({ amount: 1000 })], ctx());
    expect(result.unitPrice).toBe(90_000);
  });

  it('boshqa variantning qoidasi qo‘llanmaydi', () => {
    const result = resolvePrice(BASE, [rule({ variantId: 'boshqa' })], ctx());
    expect(result.unitPrice).toBe(BASE);
    expect(result.discountRule).toBeNull();
  });

  it('boshqa darajaning qoidasi qo‘llanmaydi', () => {
    const result = resolvePrice(BASE, [rule({ tierId: 'boshqa-daraja' })], ctx());
    expect(result.unitPrice).toBe(BASE);
  });

  it('boshqa hududning qoidasi qo‘llanmaydi', () => {
    const result = resolvePrice(BASE, [rule({ region: 'Samarqand' })], ctx());
    expect(result.unitPrice).toBe(BASE);
  });

  it("diler YO'Q bo'lsa, dilerga atalgan qoidalar qo'llanmaydi", () => {
    const result = resolvePrice(
      BASE,
      [rule({ dealerId: DEALER }), rule({ tierId: TIER }), rule({ region: 'Toshkent' })],
      ctx({ dealer: undefined }),
    );

    expect(result.unitPrice).toBe(BASE);
  });
});

describe('ustunlik: KIMGA "nimaga" dan kuchli', () => {
  it('diler qoidasi daraja qoidasidan ustun', () => {
    const result = resolvePrice(
      BASE,
      [rule({ tierId: TIER, amount: 3000 }), rule({ dealerId: DEALER, amount: 1000 })],
      ctx(),
    );

    // Diler qoidasi yutadi, garchi u KAMROQ chegirma bersa ham:
    // narx mijoz bilan kelishiladi, "foydaliroq" degan qoida yo'q.
    expect(result.discountRule?.amount).toBe(1000);
    expect(result.unitPrice).toBe(90_000);
  });

  it('daraja qoidasi hudud qoidasidan ustun', () => {
    const result = resolvePrice(
      BASE,
      [rule({ region: 'Toshkent', amount: 3000 }), rule({ tierId: TIER, amount: 1000 })],
      ctx(),
    );

    expect(result.discountRule?.amount).toBe(1000);
  });

  it('hudud qoidasi umumiy qoidadan ustun', () => {
    const result = resolvePrice(
      BASE,
      [rule({ amount: 3000 }), rule({ region: 'Toshkent', amount: 1000 })],
      ctx(),
    );

    expect(result.discountRule?.amount).toBe(1000);
  });

  it('DILERGA atalgan KATEGORIYA qoidasi DARAJAGA atalgan VARIANT qoidasidan ustun', () => {
    // Bu qoidaning eng muhim natijasi: "kimga" "nimaga" dan kuchli.
    const result = resolvePrice(
      BASE,
      [
        rule({ tierId: TIER, variantId: VARIANT, amount: 3000 }),
        rule({ dealerId: DEALER, categoryId: CATEGORY, amount: 1000 }),
      ],
      ctx(),
    );

    expect(result.discountRule?.amount).toBe(1000);
  });
});

describe('ustunlik: NIMAGA', () => {
  it('variant > mahsulot > kategoriya > hammasi', () => {
    const all = rule({ amount: 100 });
    const category = rule({ categoryId: CATEGORY, amount: 200 });
    const product = rule({ productId: PRODUCT, amount: 300 });
    const variant = rule({ variantId: VARIANT, amount: 400 });

    expect(resolvePrice(BASE, [all, category, product, variant], ctx()).discountRule?.amount).toBe(
      400,
    );
    expect(resolvePrice(BASE, [all, category, product], ctx()).discountRule?.amount).toBe(300);
    expect(resolvePrice(BASE, [all, category], ctx()).discountRule?.amount).toBe(200);
    expect(resolvePrice(BASE, [all], ctx()).discountRule?.amount).toBe(100);
  });
});

describe('hajm chegirmasi (minQuantity)', () => {
  const tiers = [
    rule({ minQuantity: 1, amount: 0 }),
    rule({ minQuantity: 10, amount: 500 }),
    rule({ minQuantity: 100, amount: 1000 }),
    rule({ minQuantity: 1000, amount: 2000 }),
  ];

  it('miqdorga mos ENG YUQORI pog‘ona qo‘llanadi', () => {
    expect(resolvePrice(BASE, tiers, ctx({ quantity: 5 })).discountRule?.amount).toBe(0);
    expect(resolvePrice(BASE, tiers, ctx({ quantity: 10 })).discountRule?.amount).toBe(500);
    expect(resolvePrice(BASE, tiers, ctx({ quantity: 99 })).discountRule?.amount).toBe(500);
    expect(resolvePrice(BASE, tiers, ctx({ quantity: 100 })).discountRule?.amount).toBe(1000);
    expect(resolvePrice(BASE, tiers, ctx({ quantity: 5000 })).discountRule?.amount).toBe(2000);
  });

  it("miqdor yetmasa, pog'ona umuman qo'llanmaydi", () => {
    const result = resolvePrice(
      BASE,
      [rule({ minQuantity: 50, amount: 2000 })],
      ctx({ quantity: 49 }),
    );
    expect(result.discountRule).toBeNull();
    expect(result.unitPrice).toBe(BASE);
  });

  it("aniqlik BIR XIL bo'lsa, katta minQuantity ustun", () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ tierId: TIER, minQuantity: 1, amount: 100 }),
        rule({ tierId: TIER, minQuantity: 50, amount: 900 }),
      ],
      ctx({ quantity: 100 }),
    );

    expect(result.discountRule?.amount).toBe(900);
  });
});

describe('qat’iy narx (FIXED_PRICE)', () => {
  it('bazaviy narx O‘RNIGA qo‘yiladi', () => {
    const result = resolvePrice(
      BASE,
      [rule({ kind: 'FIXED_PRICE', amount: 75_000, dealerId: DEALER })],
      ctx(),
    );

    expect(result.basePrice).toBe(BASE);
    expect(result.unitPrice).toBe(75_000);
    expect(result.priceRule?.amount).toBe(75_000);
  });

  it('chegirma QAT’IY NARXDAN hisoblanadi, bazaviydan emas', () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ kind: 'FIXED_PRICE', amount: 50_000 }),
        rule({ kind: 'PERCENT_DISCOUNT', amount: 1000 }),
      ],
      ctx(),
    );

    // 50 000 dan 10% = 5 000, bazaviy 100 000 dan 10 000 EMAS.
    expect(result.discount).toBe(5_000);
    expect(result.unitPrice).toBe(45_000);
  });

  it("qat'iy narx qoidalari o'zaro ham ustunlik bo'yicha saralanadi", () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ kind: 'FIXED_PRICE', amount: 80_000, tierId: TIER }),
        rule({ kind: 'FIXED_PRICE', amount: 60_000, dealerId: DEALER }),
      ],
      ctx(),
    );

    expect(result.unitPrice).toBe(60_000);
  });
});

describe('daraja chegirmasi — qoida bo‘lmaganda', () => {
  it('qoida yo‘q bo‘lsa DARAJA chegirmasi qo‘llanadi', () => {
    const result = resolvePrice(
      BASE,
      [],
      ctx({ dealer: { id: DEALER, tierId: TIER, region: null, tierDiscountBasisPoints: 250 } }),
    );

    expect(result.unitPrice).toBe(97_500);
    expect(result.tierDiscountBasisPoints).toBe(250);
    expect(result.discountRule).toBeNull();
  });

  it('qoida BOR bo‘lsa daraja chegirmasi qo‘llanMAYDI', () => {
    const result = resolvePrice(
      BASE,
      [rule({ amount: 1000 })],
      ctx({ dealer: { id: DEALER, tierId: TIER, region: null, tierDiscountBasisPoints: 250 } }),
    );

    // 10% qoida, 2.5% daraja — USTMA-UST QO'YILMAYDI.
    expect(result.unitPrice).toBe(90_000);
    expect(result.tierDiscountBasisPoints).toBeNull();
  });

  it('daraja chegirmasi 0 bo‘lsa, hisobotda ko‘rsatilmaydi', () => {
    const result = resolvePrice(BASE, [], ctx());

    expect(result.unitPrice).toBe(BASE);
    expect(result.tierDiscountBasisPoints).toBeNull();
  });
});

describe('aksiya kodi', () => {
  const promo = rule({ code: 'YOZ2026', amount: 2000 });

  it('kod KIRITILMASA qoida umuman hisobga olinmaydi', () => {
    const result = resolvePrice(BASE, [promo], ctx());

    expect(result.unitPrice).toBe(BASE);
    expect(result.promoApplied).toBe(false);
  });

  it("NOTO'G'RI kod ham hisobga olinmaydi", () => {
    const result = resolvePrice(BASE, [promo], ctx({ promoCode: 'BOSHQA' }));
    expect(result.promoApplied).toBe(false);
  });

  it('to‘g‘ri kod chegirma beradi', () => {
    const result = resolvePrice(BASE, [promo], ctx({ promoCode: 'YOZ2026' }));

    expect(result.promoApplied).toBe(true);
    expect(result.unitPrice).toBe(80_000);
  });

  it('kod MIJOZGA ZARAR keltirmaydi — yomonrog‘i bo‘lsa qo‘llanmaydi', () => {
    // Dilerga atalgan qoida 30% beradi; kod esa faqat 20%.
    // Aniqlik bo'yicha kodsiz qoida baribir yutishi kerak.
    const result = resolvePrice(
      BASE,
      [rule({ dealerId: DEALER, amount: 3000 }), promo],
      ctx({ promoCode: 'YOZ2026' }),
    );

    expect(result.promoApplied).toBe(false);
    expect(result.unitPrice).toBe(70_000);
  });

  it('kod aniqligi past bo‘lsa ham, FOYDALIROQ bo‘lsa qo‘llanadi', () => {
    const result = resolvePrice(
      BASE,
      [rule({ dealerId: DEALER, amount: 500 }), rule({ code: 'KATTA', amount: 4000 })],
      ctx({ promoCode: 'KATTA' }),
    );

    expect(result.promoApplied).toBe(true);
    expect(result.unitPrice).toBe(60_000);
  });
});

describe('chegaralar va yaxlitlash', () => {
  it('chegirma narxdan OSHIB ketmaydi — manfiy narx bo‘lmaydi', () => {
    const result = resolvePrice(
      BASE,
      [rule({ kind: 'AMOUNT_DISCOUNT', amount: 500_000 })],
      ctx({ quantity: 3 }),
    );

    expect(result.unitPrice).toBe(0);
    expect(result.total).toBe(0);
  });

  it('100% chegirma narxni aynan nolga tushiradi', () => {
    const result = resolvePrice(BASE, [rule({ amount: 10_000 })], ctx());
    expect(result.unitPrice).toBe(0);
  });

  it('foiz BUTUN tiyinga yaxlitlanadi', () => {
    // 33 333 tiyindan 3.33% = 1109.98... -> 1110
    const result = resolvePrice(33_333, [rule({ amount: 333 })], ctx());

    expect(Number.isInteger(result.discount)).toBe(true);
    expect(result.discount).toBe(1110);
    expect(result.unitPrice).toBe(32_223);
  });

  it('yakuniy summa miqdorga ko‘paytiriladi', () => {
    const result = resolvePrice(BASE, [rule({ amount: 1000 })], ctx({ quantity: 7 }));

    expect(result.unitPrice).toBe(90_000);
    expect(result.total).toBe(630_000);
  });

  it('manfiy qat‘iy narx nolga qisqartiriladi', () => {
    const result = resolvePrice(BASE, [rule({ kind: 'FIXED_PRICE', amount: -5 })], ctx());
    expect(result.unitPrice).toBe(0);
  });
});

describe('ANIQLIK: natija qoidalar tartibiga bog‘liq emas', () => {
  const rules = [
    rule({ amount: 100 }),
    rule({ tierId: TIER, amount: 200 }),
    rule({ dealerId: DEALER, amount: 300 }),
    rule({ dealerId: DEALER, variantId: VARIANT, amount: 400 }),
    rule({ region: 'Toshkent', minQuantity: 10, amount: 500 }),
    rule({ kind: 'FIXED_PRICE', amount: 90_000, productId: PRODUCT }),
  ];

  it('har qanday tartibda bir xil natija beradi', () => {
    const expected = resolvePrice(BASE, rules, ctx({ quantity: 50 }));

    // Aylantirib chiqamiz: tartib natijaga ta'sir qilmasligi kerak.
    for (let shift = 1; shift < rules.length; shift += 1) {
      const rotated = [...rules.slice(shift), ...rules.slice(0, shift)];
      expect(resolvePrice(BASE, rotated, ctx({ quantity: 50 })), `siljish ${shift}`).toEqual(
        expected,
      );
    }

    // Teskari tartibda ham.
    expect(resolvePrice(BASE, [...rules].reverse(), ctx({ quantity: 50 }))).toEqual(expected);
  });

  it('kirish massivini O‘ZGARTIRMAYDI', () => {
    const input = [...rules];
    const snapshot = input.map((r) => r.id);

    resolvePrice(BASE, input, ctx());

    expect(input.map((r) => r.id)).toEqual(snapshot);
  });

  /**
   * BUTUNLAY TENG ikki qoida.
   *
   * Bu holat oson e'tibordan chetda qoladi, lekin aynan u xavfli:
   * `Array.sort` BARQAROR, ya'ni tenglikda KIRISH TARTIBI g'olibni
   * hal qilardi — va u tartib bazadan keladi. Bir xil so'rov turli
   * paytda turli narx berishi mumkin edi.
   *
   * Bu testni ataylab MUTATSIYA bilan tekshirdim: `id` bo'yicha
   * oxirgi solishtirishni olib tashlaganimda qolgan 34 ta test
   * BARIBIR o'tdi — ya'ni qoida himoyalanmagan edi. Shu test
   * qo'shilgach mutatsiya ushlanadigan bo'ldi.
   */
  it("BUTUNLAY teng ikki qoida uchun ham natija QAT'IY", () => {
    const shared = {
      tierId: TIER,
      amount: 100,
      priority: 3,
      validFrom: new Date('2026-03-01T00:00:00Z'),
    };

    const a = rule({ ...shared, id: 'r-aaa', name: 'A' });
    const b = rule({ ...shared, id: 'r-bbb', name: 'B', amount: 900 });

    const forward = resolvePrice(BASE, [a, b], ctx());
    const backward = resolvePrice(BASE, [b, a], ctx());

    expect(forward).toEqual(backward);
  });

  it('BIR XIL aniqlikdagi ikki qoida uchun `priority` hal qiladi', () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ tierId: TIER, amount: 100, priority: 1 }),
        rule({ tierId: TIER, amount: 900, priority: 5 }),
      ],
      ctx(),
    );

    expect(result.discountRule?.amount).toBe(900);
  });

  it("`priority` ham teng bo'lsa, YANGIROQ qoida ustun", () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ tierId: TIER, amount: 100, validFrom: new Date('2026-01-01') }),
        rule({ tierId: TIER, amount: 900, validFrom: new Date('2026-06-01') }),
      ],
      ctx(),
    );

    expect(result.discountRule?.amount).toBe(900);
  });
});

describe('javob TUSHUNTIRIB beradi', () => {
  it('qaysi qoida qo‘llangani NOMI bilan qaytadi', () => {
    const result = resolvePrice(
      BASE,
      [
        rule({ kind: 'FIXED_PRICE', amount: 80_000, name: 'Shartnoma narxi' }),
        rule({ amount: 500, name: 'Hajm chegirmasi' }),
      ],
      ctx(),
    );

    expect(result.priceRule?.name).toBe('Shartnoma narxi');
    expect(result.discountRule?.name).toBe('Hajm chegirmasi');
    expect(result.basePrice).toBe(BASE);
    expect(result.discount).toBe(4_000);
    expect(result.unitPrice).toBe(76_000);
  });
});
