/**
 * NARX DVIGATELI — sof funksiya (CLAUDE.md §5).
 *
 * BU FAYLDA BAZA HAM, NEST HAM YO'Q. Sabab: narx hisobi biznesning
 * eng nozik qismi va u TO'LIQ sinaladigan bo'lishi kerak. Bazaga
 * bog'langan kodni har bir ustunlik holati uchun sinash qimmat
 * bo'lardi, shuning uchun ma'lumot yuklash (`PricingService`) va
 * HISOB (shu fayl) ajratilgan.
 *
 * Narx FAQAT shu yerda hisoblanadi. Frontend uni QAYTA HISOBLAMAYDI:
 * u serverdan kelgan `unitPrice` ni ko'rsatadi, xolos. Aks holda ikki
 * joyda ikki xil natija chiqib, mijoz ko'rgan narx bilan hisob-faktura
 * farq qilardi.
 *
 * PUL BUTUN SONDA (tiyin). Suzuvchi nuqta yig'indida xato to'playdi.
 * Foiz ham butun sonda — BAZIS PUNKT (250 = 2.5%).
 */

export type PriceRuleKind = 'FIXED_PRICE' | 'PERCENT_DISCOUNT' | 'AMOUNT_DISCOUNT';

/** Hisob uchun kerakli qoida maydonlari (Prisma qatoridan kichikroq). */
export interface PriceRuleInput {
  id: string;
  name: string;
  kind: PriceRuleKind;
  amount: number;
  variantId: string | null;
  productId: string | null;
  categoryId: string | null;
  dealerId: string | null;
  tierId: string | null;
  region: string | null;
  minQuantity: number;
  code: string | null;
  priority: number;
  validFrom: Date;
}

export interface PriceContext {
  variantId: string;
  productId: string;
  categoryId: string;
  quantity: number;
  /** Diler bo'lmasligi mumkin — ommaviy narx so'ralganda. */
  dealer?:
    | {
        id: string;
        tierId: string | null;
        region: string | null;
        /** Daraja chegirmasi, bazis punktda. Qoida topilmasa SHU qo'llanadi. */
        tierDiscountBasisPoints: number;
      }
    | undefined;
  /** Mijoz kiritgan aksiya kodi. */
  promoCode?: string | undefined;
}

export interface AppliedRule {
  id: string;
  name: string;
  kind: PriceRuleKind;
  amount: number;
}

export interface PriceResult {
  /** Chegirmasiz bazaviy narx (tiyin, bir dona uchun). */
  basePrice: number;
  /** Qoida qo'llangandan keyingi bir dona narxi (tiyin). */
  unitPrice: number;
  /** Bir dona uchun chegirma summasi (tiyin). */
  discount: number;
  /** `unitPrice * quantity`. */
  total: number;
  /** Bazaviy narx o'rniga qo'yilgan qoida (bo'lsa). */
  priceRule: AppliedRule | null;
  /** Chegirma bergan qoida (bo'lsa). */
  discountRule: AppliedRule | null;
  /**
   * Chegirma qoidadan emas, DILER DARAJASIDAN kelgan bo'lsa — bazis
   * punktda. Aks holda `null`.
   */
  tierDiscountBasisPoints: number | null;
  /** Aksiya kodi qo'llandimi. */
  promoApplied: boolean;
}

/**
 * Qoida shu kontekstga MOS keladimi.
 *
 * Qamrov maydoni `null` bo'lsa — "hammasi uchun", ya'ni mos keladi.
 * To'ldirilgan bo'lsa — aniq tengligi talab qilinadi.
 */
function matches(rule: PriceRuleInput, ctx: PriceContext, promoCode: string | undefined): boolean {
  if (rule.minQuantity > ctx.quantity) return false;

  if (rule.variantId !== null && rule.variantId !== ctx.variantId) return false;
  if (rule.productId !== null && rule.productId !== ctx.productId) return false;
  if (rule.categoryId !== null && rule.categoryId !== ctx.categoryId) return false;

  if (rule.dealerId !== null && rule.dealerId !== ctx.dealer?.id) return false;
  if (rule.tierId !== null && rule.tierId !== ctx.dealer?.tierId) return false;
  if (rule.region !== null && rule.region !== ctx.dealer?.region) return false;

  /*
    Aksiya kodli qoida FAQAT kod kiritilganda hisobga olinadi.

    Aks holda har bir mijoz uni bilmasdan olardi — ya'ni "aksiya"
    shunchaki doimiy narx bo'lib qolardi.
  */
  if (rule.code !== null && rule.code !== promoCode) return false;

  return true;
}

/**
 * QAYSI QOIDA USTUN.
 *
 * Tartib ATAYLAB qat'iy va to'liq: ikki qoida hech qachon "teng"
 * bo'lib qolmaydi, ya'ni natija ma'lumotlar bazasidagi tartibga
 * BOG'LIQ EMAS. Bu muhim — aks holda bir xil so'rov turli paytda
 * turli narx berishi mumkin edi.
 *
 * Tartib:
 *   1. KIMGA (diler > daraja > hudud > hammasi)
 *      Narx MIJOZ bilan kelishiladi, shuning uchun "kimga" "nimaga"
 *      dan ustun: dilerga atalgan kategoriya qoidasi darajaga
 *      atalgan variant qoidasidan kuchliroq.
 *   2. NIMAGA (variant > mahsulot > kategoriya > hammasi)
 *   3. `minQuantity` — kattasi (hajm chegirmasining yuqori pog'onasi).
 *   4. `priority` — qo'lda belgilangan ustunlik.
 *   5. `validFrom` — yangisi.
 *   6. `id` — oxirgi, to'liq aniqlik uchun.
 */
function whoScore(rule: PriceRuleInput): number {
  if (rule.dealerId !== null) return 3;
  if (rule.tierId !== null) return 2;
  if (rule.region !== null) return 1;
  return 0;
}

function whatScore(rule: PriceRuleInput): number {
  if (rule.variantId !== null) return 3;
  if (rule.productId !== null) return 2;
  if (rule.categoryId !== null) return 1;
  return 0;
}

function compare(a: PriceRuleInput, b: PriceRuleInput): number {
  return (
    whoScore(b) - whoScore(a) ||
    whatScore(b) - whatScore(a) ||
    b.minQuantity - a.minQuantity ||
    b.priority - a.priority ||
    b.validFrom.getTime() - a.validFrom.getTime() ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

/** Eng ustun qoida yoki `null`. */
function best(rules: PriceRuleInput[]): PriceRuleInput | null {
  if (rules.length === 0) return null;

  return [...rules].sort(compare)[0] ?? null;
}

/**
 * Chegirma summasi (bir dona uchun, tiyin).
 *
 * Natija HECH QACHON narxdan katta bo'lmaydi: aks holda manfiy narx
 * chiqardi va u butun buyurtma yig'indisini buzardi.
 */
function discountFor(kind: PriceRuleKind, amount: number, price: number): number {
  const raw =
    kind === 'PERCENT_DISCOUNT'
      ? // Bazis punkt: 250 = 2.5%. Yaxlitlash butun tiyinga.
        Math.round((price * amount) / 10_000)
      : amount;

  return Math.min(Math.max(raw, 0), price);
}

function toApplied(rule: PriceRuleInput): AppliedRule {
  return { id: rule.id, name: rule.name, kind: rule.kind, amount: rule.amount };
}

/**
 * NARXNI HISOBLASH.
 *
 * IKKI BOSQICH, va har bosqichda FAQAT BITTA qoida qo'llanadi.
 *
 * NEGA chegirmalar USTMA-UST QO'YILMAYDI: ustma-ust qo'yilganda
 * natija qoidalar sonining ko'payishi bilan oldindan aytib
 * bo'lmaydigan holga keladi — uchta 10% lik qoida 30% emas, 27.1%
 * beradi va buni mijozga tushuntirib bo'lmaydi. Har bosqichda
 * "eng ustun bitta qoida" esa har doim tushuntiriladi: javobda
 * qaysi qoida qo'llangani NOMI bilan qaytadi.
 *
 *   1-bosqich — NARX: eng ustun `FIXED_PRICE` qoidasi, yo'q bo'lsa
 *      bazaviy narx.
 *   2-bosqich — CHEGIRMA: eng ustun chegirma qoidasi, yo'q bo'lsa
 *      dilerning DARAJA chegirmasi.
 *
 * AKSIYA KODI: kodli qoida odatdagi g'olib bilan solishtiriladi va
 * MIJOZ FOYDASIGA hal qilinadi. Aks holda kod kiritgan mijoz undan
 * ZARAR ko'rishi mumkin edi — bu esa kodni umuman kiritmaslikka
 * undardi.
 */
export function resolvePrice(
  basePrice: number,
  rules: PriceRuleInput[],
  ctx: PriceContext,
): PriceResult {
  const promoCode = ctx.promoCode;

  const applicable = rules.filter((rule) => matches(rule, ctx, promoCode));

  // --- 1-bosqich: narx ------------------------------------------------------
  const priceRule = best(applicable.filter((rule) => rule.kind === 'FIXED_PRICE'));
  const price = priceRule === null ? basePrice : Math.max(priceRule.amount, 0);

  // --- 2-bosqich: chegirma --------------------------------------------------
  const discounts = applicable.filter((rule) => rule.kind !== 'FIXED_PRICE');

  /*
    Kodli va kodsiz qoidalar ALOHIDA baholanadi, so'ng natija
    solishtiriladi. Bitta ro'yxatda saralansa, kod aniqlik bo'yicha
    yutqazib, umuman ishlamay qolishi mumkin edi.
  */
  const plainRule = best(discounts.filter((rule) => rule.code === null));
  const promoRule = best(discounts.filter((rule) => rule.code !== null));

  const tierBp = ctx.dealer?.tierDiscountBasisPoints ?? 0;

  const plainDiscount =
    plainRule !== null
      ? discountFor(plainRule.kind, plainRule.amount, price)
      : // Qoida yo'q — daraja chegirmasi.
        discountFor('PERCENT_DISCOUNT', tierBp, price);

  const promoDiscount =
    promoRule !== null ? discountFor(promoRule.kind, promoRule.amount, price) : 0;

  const usePromo = promoRule !== null && promoDiscount > plainDiscount;

  const discount = usePromo ? promoDiscount : plainDiscount;
  const discountRule = usePromo ? promoRule : plainRule;

  const unitPrice = price - discount;

  return {
    basePrice,
    unitPrice,
    discount,
    total: unitPrice * ctx.quantity,
    priceRule: priceRule === null ? null : toApplied(priceRule),
    discountRule: discountRule === null ? null : toApplied(discountRule),
    // Daraja chegirmasi FAQAT qoida topilmaganda va u haqiqatda
    // ishlaganda ko'rsatiladi.
    tierDiscountBasisPoints: discountRule === null && discount > 0 ? tierBp : null,
    promoApplied: usePromo,
  };
}
