import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type PublicImage } from '@barff/types';
import { STORAGE_ADAPTER, type StorageAdapter } from '../media/storage/storage.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicImage } from '../public/public.mappers';
import { PricingService, type QuoteLine } from '../pricing/pricing.service';

/** Savat pozitsiyasi — narx bilan birga, lekin narx SAQLANMAGAN. */
export interface CartLine extends QuoteLine {
  itemId: string;
  productSlug: string;
  productName: unknown;
  volumeMl: number;
  unitsPerPack: number | null;
  image: PublicImage | null;
  /**
   * Eng kam buyurtma miqdori BUZILGANMI.
   *
   * Savatga QO'SHISHDA rad etilmaydi: diler miqdorni bosqichma-bosqich
   * oshiradi va har bosishda xato ko'rish uni chalg'itardi. Tekshiruv
   * buyurtma YUBORISHDA majburiy bo'ladi (S26).
   */
  belowMinimum: boolean;
}

export interface CartView {
  id: string;
  promoCode: string | null;
  lines: CartLine[];
  total: number;
  currency: string;
  /** Eng kam miqdor buzilgan pozitsiyalar bormi. */
  hasIssues: boolean;
}

/**
 * Diler savati (CLAUDE.md §5).
 *
 * IKKI QAT'IY QOIDA:
 *
 * 1. NARX SAVATDA SAQLANMAYDI. U har bir o'qishda `PricingService`
 *    orqali qayta hisoblanadi. Aks holda bir hafta ochiq turgan
 *    savat eski narxni ushlab qolardi.
 *
 * 2. MIJOZDAN KELGAN NARX UMUMAN O'QILMAYDI. Endpoint'lar faqat
 *    `variantId` va `quantity` qabul qiladi — narx maydoni sxemada
 *    YO'Q, ya'ni uni yuborish hech narsaga ta'sir qilmaydi
 *    (`ROADMAP.md` S25 DoD).
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  /** Rasm manzili — dilerda `content.view` ruxsati yo'q (katalogdagi kabi). */
  private readonly url = (key: string): string => this.storage.publicUrl(key);

  /** Savat bor bo'lsa oladi, yo'q bo'lsa yaratadi. */
  private async ensure(dealerId: string) {
    return this.prisma.cart.upsert({
      where: { dealerId },
      create: { dealerId },
      update: {},
      select: { id: true, promoCode: true },
    });
  }

  /**
   * Savat va uning JORIY narxi.
   *
   * Narx butun savat uchun BITTA chaqiruvda hisoblanadi: har bir
   * pozitsiya alohida so'ralsa, hajm chegirmasi va aksiya kodi
   * pozitsiyalar orasida farq qilib ketishi mumkin edi.
   */
  async view(dealerId: string): Promise<CartView> {
    const cart = await this.ensure(dealerId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        quantity: true,
        variantId: true,
        variant: {
          select: {
            volumeMl: true,
            unitsPerPack: true,
            minOrderQuantity: true,
            product: {
              select: {
                slug: true,
                name: true,
                images: {
                  // `ProductImage` da yumshoq o'chirish YO'Q — rasm
                  // mahsulot bilan birga o'chadi (`onDelete: Cascade`).
                  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                  take: 1,
                  select: { mediaAsset: true },
                },
              },
            },
          },
        },
      },
    });

    if (items.length === 0) {
      return {
        id: cart.id,
        promoCode: cart.promoCode,
        lines: [],
        total: 0,
        currency: 'UZS',
        hasIssues: false,
      };
    }

    const quotes = await this.pricing.quote(
      items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        ...(cart.promoCode !== null ? { promoCode: cart.promoCode } : {}),
      })),
      { dealerId },
    );

    const lines: CartLine[] = items.map((item, index) => {
      const quote = quotes[index];
      /* c8 ignore next -- `quote()` kirish bilan bir xil uzunlikda qaytaradi */
      if (quote === undefined) throw new NotFoundException();

      const minimum = item.variant.minOrderQuantity;

      return {
        ...quote,
        itemId: item.id,
        productSlug: item.variant.product.slug,
        productName: item.variant.product.name,
        volumeMl: item.variant.volumeMl,
        unitsPerPack: item.variant.unitsPerPack,
        image: toPublicImage(item.variant.product.images[0]?.mediaAsset, this.url),
        belowMinimum: minimum !== null && item.quantity < minimum,
      };
    });

    return {
      id: cart.id,
      promoCode: cart.promoCode,
      lines,
      // Jami SERVERDA yig'iladi: frontend qayta yig'sa, yaxlitlash
      // farqi paydo bo'lishi mumkin edi.
      total: lines.reduce((sum, line) => sum + line.total, 0),
      currency: lines[0]?.currency ?? 'UZS',
      hasIssues: lines.some((line) => line.belowMinimum),
    };
  }

  /**
   * Pozitsiya qo'shish.
   *
   * Variant allaqachon savatda bo'lsa miqdor QO'SHILADI, yangi qator
   * yaratilmaydi: bir xil mahsulot savatda ikki marta turishi
   * dilerni chalg'itardi va jami summani tekshirishni qiyinlashtirardi.
   */
  async add(dealerId: string, variantId: string, quantity: number): Promise<CartView> {
    await this.requireVariant(variantId);

    const cart = await this.ensure(dealerId);

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });

    await this.clampQuantity(cart.id, variantId);

    return this.view(dealerId);
  }

  /** Miqdorni ANIQ qiymatga qo'yadi. `0` — pozitsiyani o'chiradi. */
  async setQuantity(dealerId: string, itemId: string, quantity: number): Promise<CartView> {
    const cart = await this.ensure(dealerId);
    await this.requireOwn(cart.id, itemId);

    if (quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }

    return this.view(dealerId);
  }

  async remove(dealerId: string, itemId: string): Promise<CartView> {
    const cart = await this.ensure(dealerId);
    await this.requireOwn(cart.id, itemId);

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.view(dealerId);
  }

  async clear(dealerId: string): Promise<CartView> {
    const cart = await this.ensure(dealerId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return this.view(dealerId);
  }

  /**
   * Aksiya kodini qo'yish yoki olib tashlash (`null`).
   *
   * Kod TEKSHIRILMAYDI va bu ataylab: mavjud bo'lmagan kod
   * shunchaki hech narsa bermaydi (`PriceResolver` uni topmaydi).
   * "Kod noto'g'ri" xatosi kodlarni taxmin qilish vositasiga
   * aylanardi — qaysi kod BOR ekanini aniqlash mumkin bo'lardi.
   */
  async setPromoCode(dealerId: string, code: string | null): Promise<CartView> {
    const cart = await this.ensure(dealerId);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { promoCode: code },
    });

    return this.view(dealerId);
  }

  private async requireVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (variant === null) {
      throw new NotFoundException({ message: 'Variant topilmadi', code: 'VARIANT_NOT_FOUND' });
    }
  }

  /**
   * Pozitsiya SHU savatnikimi.
   *
   * Topilmagan va BOSHQA dilerniki — bir xil javob (404). Ajratilsa,
   * bu endpoint boshqa dilerlarning savat id larini tekshirish
   * vositasiga aylanardi.
   */
  private async requireOwn(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      select: { id: true },
    });

    if (item === null) {
      throw new NotFoundException({
        message: 'Savatda bunday pozitsiya yo‘q',
        code: 'CART_ITEM_NOT_FOUND',
      });
    }
  }

  /**
   * Yuqori chegara.
   *
   * `increment` bilan qo'shish miqdorni cheksiz oshirishi mumkin —
   * sxemadagi chegara faqat BITTA so'rovdagi qiymatni tekshiradi.
   * Shuning uchun qo'shgandan keyin natija ham tekshiriladi.
   */
  private async clampQuantity(cartId: string, variantId: string) {
    const item = await this.prisma.cartItem.findUniqueOrThrow({
      where: { cartId_variantId: { cartId, variantId } },
      select: { id: true, quantity: true },
    });

    if (item.quantity > CartService.MAX_QUANTITY) {
      throw new BadRequestException({
        message: `Bitta pozitsiya uchun eng ko‘pi ${CartService.MAX_QUANTITY} dona`,
        code: 'CART_QUANTITY_TOO_LARGE',
      });
    }
  }

  static readonly MAX_QUANTITY = 1_000_000;
}
