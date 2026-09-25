import { Inject, Injectable } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { STORAGE_ADAPTER, type StorageAdapter } from '../media/storage/storage.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicImage } from '../public/public.mappers';
import { PricingService } from '../pricing/pricing.service';

export interface CatalogQuery {
  page: number;
  limit: number;
  categoryId?: string | undefined;
  search?: string | undefined;
  volumeMl?: number | undefined;
}

/**
 * Diler katalogi.
 *
 * OMMAVIY KATALOGDAN FARQI: har bir variant DILER NARXI bilan
 * qaytadi. Ommaviy sayt bazaviy narxni ko'rsatadi, diler esa o'z
 * shartlariga ko'ra hisoblangan narxni.
 *
 * Narx `PricingService` orqali hisoblanadi — ya'ni bitta joyda
 * (CLAUDE.md §5). Bu yerda hech qanday hisob YO'Q.
 */
@Injectable()
export class DealerCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  /*
    Rasm manzili OMMAVIY MAPPER orqali quriladi.

    Dilerda `content.view` ruxsati YO'Q, ya'ni u `/media/:id/url`
    endpoint'iga yeta olmaydi. Mapper esa manzilni javobning O'ZIGA
    qo'yadi — xuddi ommaviy katalogdagi kabi — va obyekt kaliti
    javobga chiqmaydi.
  */
  private readonly url = (key: string): string => this.storage.publicUrl(key);

  async list(dealerId: string, query: CatalogQuery) {
    const request = toPageRequest({ ...query, sortOrder: 'asc' });

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
      /*
        QIDIRUV ko'p tilli maydon ichida.

        `name` — JSON (`{uz, ru, en}`), shuning uchun oddiy
        `contains` ishlamaydi. Prisma JSON ichida qidirishni
        cheklangan qo'llab-quvvatlaydi, shuning uchun `slug` va
        `sku` bo'yicha qidiramiz — ular lotin harflarida va diler
        odatda shularni biladi. To'liq matn qidiruvi (Postgres
        `tsvector`) keyingi qadamga qoldirildi va bu ataylab:
        yarim ishlaydigan qidiruv umuman yo'qidan yomonroq.
      */
      ...(query.search !== undefined
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      variants: {
        some: {
          deletedAt: null,
          isActive: true,
          ...(query.volumeMl !== undefined ? { volumeMl: query.volumeMl } : {}),
        },
      },
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip: request.skip,
        take: request.take,
        select: {
          id: true,
          slug: true,
          sku: true,
          name: true,
          flavor: true,
          category: { select: { id: true, slug: true, name: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 1,
            select: { mediaAsset: true },
          },
          variants: {
            where: {
              deletedAt: null,
              isActive: true,
              ...(query.volumeMl !== undefined ? { volumeMl: query.volumeMl } : {}),
            },
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              sku: true,
              volumeMl: true,
              unitsPerPack: true,
              minOrderQuantity: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    /*
      NARX BITTA CHAQIRUVDA.

      Har bir variant uchun alohida so'rov yuborilsa, 24 ta
      mahsulotli sahifa 50+ so'rovga aylanardi. `quote()` hammasini
      birga hisoblaydi.

      `quantity: 1` — ro'yxatdagi narx BIR DONA uchun. Hajm
      chegirmasi savatda, miqdor ma'lum bo'lgach qo'llanadi.
    */
    const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.id));

    const quotes =
      variantIds.length === 0
        ? []
        : await this.pricing.quote(
            variantIds.map((variantId) => ({ variantId, quantity: 1 })),
            // Narxsiz variant butun katalogni yiqitmaydi — u
            // "narx belgilanmagan" bo'lib ko'rinadi (S30 da
            // o'lchab topilgan nosozlik).
            { dealerId, skipUnpriced: true },
          );

    const priceByVariant = new Map(quotes.map((quote) => [quote.variantId, quote]));

    const items = products.map(({ images, ...product }) => ({
      ...product,
      image: toPublicImage(images[0]?.mediaAsset, this.url),
      variants: product.variants.map((variant) => {
        const quote = priceByVariant.get(variant.id);

        return {
          ...variant,
          // Narx belgilanmagan variant ham ro'yxatda QOLADI: uni
          // yashirish diler uchun "mahsulot yo'qoldi" bo'lib
          // ko'rinardi. Narx o'rniga `null` qaytadi.
          price:
            quote === undefined
              ? null
              : {
                  basePrice: quote.basePrice,
                  unitPrice: quote.unitPrice,
                  discount: quote.discount,
                  currency: quote.currency,
                  discountRule: quote.discountRule,
                  tierDiscountBasisPoints: quote.tierDiscountBasisPoints,
                },
        };
      }),
    }));

    return paginate(items, total, request);
  }

  /** Filtr uchun kategoriyalar — faqat mahsuloti borlari. */
  categories() {
    return this.prisma.productCategory.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        products: { some: { deletedAt: null, isActive: true } },
      },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, slug: true, name: true },
    });
  }

  /** Filtr uchun hajmlar — faqat mavjudlari. */
  async volumes() {
    const rows = await this.prisma.productVariant.findMany({
      where: { deletedAt: null, isActive: true, product: { deletedAt: null, isActive: true } },
      distinct: ['volumeMl'],
      orderBy: { volumeMl: 'asc' },
      select: { volumeMl: true },
    });

    return rows.map((row) => row.volumeMl);
  }
}
