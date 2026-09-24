import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  type PriceContext,
  type PriceResult,
  type PriceRuleInput,
  type PriceRuleKind,
  resolvePrice,
} from './price-resolver';

export interface QuoteRequest {
  variantId: string;
  quantity: number;
  promoCode?: string | undefined;
}

/**
 * Narx qoidasi uchun kiritma.
 *
 * Prisma tipi TO'G'RIDAN-TO'G'RI ishlatilmaydi: controller'da
 * `dto as unknown as Prisma...` ko'rinishidagi ikki bosqichli
 * o'tkazish kerak bo'lardi va u HAQIQIY nomuvofiqlikni ham
 * yashirardi. Bu tip DTO ga mos va Prisma'ga aniq o'giriladi.
 */
export interface PriceRuleWrite {
  name: string;
  kind: PriceRuleKind;
  amount: number;
  currency?: string | undefined;
  variantId?: string | null | undefined;
  productId?: string | null | undefined;
  categoryId?: string | null | undefined;
  dealerId?: string | null | undefined;
  tierId?: string | null | undefined;
  region?: string | null | undefined;
  minQuantity?: number | undefined;
  code?: string | null | undefined;
  validFrom?: Date | undefined;
  validTo?: Date | null | undefined;
  isActive?: boolean | undefined;
  priority?: number | undefined;
}

export interface QuoteLine extends PriceResult {
  variantId: string;
  sku: string;
  quantity: number;
  currency: string;
  /** Eng kam buyurtma miqdori buzilgan bo'lsa — nechta kerakligi. */
  minOrderQuantity: number | null;
}

interface Actor {
  id: string;
  email: string;
}

/**
 * Narxni yuklash va hisoblash.
 *
 * MA'LUMOT YUKLASH shu yerda, HISOB esa `price-resolver.ts` da —
 * ataylab ajratilgan. Hisob sof funksiya bo'lgani uchun har bir
 * ustunlik holati bazasiz sinaladi.
 *
 * NARX FAQAT SHU YERDAN chiqadi. Frontend uni qayta hisoblamaydi:
 * ikki joyda ikki xil natija chiqsa, mijoz ko'rgan narx bilan
 * hisob-faktura farq qilardi.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Bir nechta pozitsiya uchun narx.
   *
   * Savat butunligicha bitta chaqiruvda hisoblanadi: har bir pozitsiya
   * uchun alohida so'rov yuborilsa, savat oralig'ida narx o'zgarib,
   * jami summa pozitsiyalar yig'indisiga mos kelmay qolishi mumkin edi.
   */
  async quote(
    lines: QuoteRequest[],
    options: { dealerId?: string | undefined; at?: Date | undefined } = {},
  ): Promise<QuoteLine[]> {
    if (lines.length === 0) return [];

    const at = options.at ?? new Date();

    const variantIds = [...new Set(lines.map((line) => line.variantId))];

    const [variants, dealer] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds }, deletedAt: null, isActive: true },
        select: {
          id: true,
          sku: true,
          minOrderQuantity: true,
          product: { select: { id: true, categoryId: true } },
          prices: {
            // Amal qilayotgan narx: boshlangan va tugamagan.
            where: {
              validFrom: { lte: at },
              OR: [{ validTo: null }, { validTo: { gt: at } }],
            },
            orderBy: { validFrom: 'desc' },
            take: 1,
          },
        },
      }),
      options.dealerId === undefined
        ? Promise.resolve(null)
        : this.prisma.dealer.findFirst({
            where: { id: options.dealerId, deletedAt: null },
            select: {
              id: true,
              tierId: true,
              region: true,
              tier: { select: { discountBasisPoints: true } },
            },
          }),
    ]);

    const byId = new Map(variants.map((variant) => [variant.id, variant]));

    const missing = variantIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new NotFoundException({
        message: `Variant topilmadi: ${missing.join(', ')}`,
        code: 'VARIANT_NOT_FOUND',
      });
    }

    const rules = await this.activeRules(at, dealer?.id ?? null, dealer?.tierId ?? null);

    return lines.map((line) => {
      const variant = byId.get(line.variantId);
      /* c8 ignore next -- yuqorida tekshirilgan, TypeScript uchun */
      if (variant === undefined) throw new NotFoundException();

      const price = variant.prices[0];

      if (price === undefined) {
        throw new BadRequestException({
          message: `Variant uchun narx belgilanmagan: ${variant.sku}`,
          code: 'PRICE_NOT_SET',
        });
      }

      const ctx: PriceContext = {
        variantId: variant.id,
        productId: variant.product.id,
        categoryId: variant.product.categoryId,
        quantity: line.quantity,
        ...(dealer !== null
          ? {
              dealer: {
                id: dealer.id,
                tierId: dealer.tierId,
                region: dealer.region,
                tierDiscountBasisPoints: dealer.tier?.discountBasisPoints ?? 0,
              },
            }
          : {}),
        ...(line.promoCode !== undefined ? { promoCode: line.promoCode } : {}),
      };

      return {
        ...resolvePrice(price.amount, rules, ctx),
        variantId: variant.id,
        sku: variant.sku,
        quantity: line.quantity,
        currency: price.currency,
        minOrderQuantity: variant.minOrderQuantity,
      };
    });
  }

  /**
   * Amal qilayotgan qoidalar.
   *
   * Boshqa dilerlarga ATALGAN qoidalar bazadayoq chiqarib
   * tashlanadi — ularni yuklab, keyin kodda filtrlash narx
   * siyosatini kerakmas joyga olib chiqardi.
   */
  private async activeRules(
    at: Date,
    dealerId: string | null,
    tierId: string | null,
  ): Promise<PriceRuleInput[]> {
    const rows = await this.prisma.priceRule.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gt: at } }],
        AND: [
          { OR: [{ dealerId: null }, ...(dealerId !== null ? [{ dealerId }] : [])] },
          { OR: [{ tierId: null }, ...(tierId !== null ? [{ tierId }] : [])] },
        ],
      },
      select: {
        id: true,
        name: true,
        kind: true,
        amount: true,
        variantId: true,
        productId: true,
        categoryId: true,
        dealerId: true,
        tierId: true,
        region: true,
        minQuantity: true,
        code: true,
        priority: true,
        validFrom: true,
      },
    });

    return rows;
  }

  // ===========================================================================
  // ADMIN CRUD
  // ===========================================================================

  list(query: { page: number; limit: number }) {
    return this.prisma.priceRule.findMany({
      where: { deletedAt: null },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  async create(input: PriceRuleWrite, actor: Actor, ctx: RequestContext) {
    const rule = await this.prisma.priceRule.create({
      data: { name: input.name, kind: input.kind, amount: input.amount, ...toOptional(input) },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PRICE_RULE_CHANGED,
      entity: 'price_rule',
      entityId: rule.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: rule,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return rule;
  }

  async update(id: string, input: PriceRuleWrite, actor: Actor, ctx: RequestContext) {
    const before = await this.prisma.priceRule.findFirst({ where: { id, deletedAt: null } });

    if (before === null) {
      throw new NotFoundException({ message: 'Qoida topilmadi', code: 'PRICE_RULE_NOT_FOUND' });
    }

    const rule = await this.prisma.priceRule.update({
      where: { id },
      data: { name: input.name, kind: input.kind, amount: input.amount, ...toOptional(input) },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PRICE_RULE_CHANGED,
      entity: 'price_rule',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before,
      after: rule,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return rule;
  }

  /**
   * Yumshoq o'chirish.
   *
   * Buyurtmalar qaysi qoida bo'yicha berilganini saqlaydi (S26),
   * shuning uchun qoida qatori fizik o'chirilmaydi.
   */
  async remove(id: string, actor: Actor, ctx: RequestContext) {
    const before = await this.prisma.priceRule.findFirst({ where: { id, deletedAt: null } });

    if (before === null) {
      throw new NotFoundException({ message: 'Qoida topilmadi', code: 'PRICE_RULE_NOT_FOUND' });
    }

    await this.prisma.priceRule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PRICE_RULE_CHANGED,
      entity: 'price_rule',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before,
      after: null,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });
  }
}

/**
 * Ixtiyoriy maydonlarni Prisma kiritmasiga o'giradi.
 *
 * `undefined` — "tegilmadi", `null` — "bo'shatildi". Ikkalasini
 * aralashtirib yuborish qamrovni jimgina kengaytirardi: masalan
 * `dealerId` tasodifan `null` bo'lib qolsa, bitta dilerga atalgan
 * chegirma HAMMAGA tarqalardi.
 */
function toOptional(input: PriceRuleWrite): Prisma.PriceRuleUncheckedCreateInput | object {
  const data: Record<string, unknown> = {};

  for (const key of [
    'currency',
    'variantId',
    'productId',
    'categoryId',
    'dealerId',
    'tierId',
    'region',
    'minQuantity',
    'code',
    'validFrom',
    'validTo',
    'isActive',
    'priority',
  ] as const) {
    const value = input[key];
    if (value !== undefined) data[key] = value;
  }

  return data;
}
