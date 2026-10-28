import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MediaKind, MediaVisibility, Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, type StorageAdapter } from '../media/storage/storage.adapter';
import { CacheService } from '../public/cache/cache.service';
import { runUnique } from '../common/run-unique';
import { toPublicImage, toPublicProduct } from '../public/public.mappers';

/**
 * Ommaviy API uchun shart.
 *
 * Faqat faol va o'chirilmagan yozuvlar. Bu shart BITTA joyda turadi:
 * har bir so'rovda qo'lda yozilsa, birortasida unutilishi va o'chirilgan
 * mahsulot saytda ko'rinib qolishi aniq.
 */
const PUBLIC_PRODUCT_WHERE = { isActive: true, deletedAt: null } as const;

/** Ommaviy javobda ko'rsatiladigan bog'liqliklar. */
const PUBLIC_INCLUDE = {
  category: { select: { id: true, slug: true, name: true } },
  // Faol bo'lmagan variant narxi bilan birga chiqib qolmasligi kerak.
  variants: {
    where: { isActive: true, deletedAt: null },
    orderBy: { displayOrder: 'asc' },
    include: {
      prices: {
        where: { OR: [{ validTo: null }, { validTo: { gt: new Date(0) } }] },
        orderBy: { validFrom: 'desc' },
        take: 1,
      },
    },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    include: {
      mediaAsset: {
        select: {
          id: true,
          key: true,
          width: true,
          height: true,
          blurDataUrl: true,
          altText: true,
          variants: true,
        },
      },
    },
  },
  documents: {
    orderBy: { displayOrder: 'asc' },
    include: { mediaAsset: { select: { id: true, key: true, mimeType: true, byteSize: true } } },
  },
} satisfies Prisma.ProductInclude;

/**
 * Admin muharriri uchun bog'liqliklar.
 *
 * Ommaviy `PUBLIC_INCLUDE` dan farqi: faol bo'lmagan variantlar ham
 * keladi (muharrir ularni ko'rib, qayta yoqa olishi kerak) va narxlar
 * tarixi (so'nggi 10 ta) beriladi.
 */
const ADMIN_INCLUDE = {
  category: { select: { id: true, slug: true, name: true } },
  variants: {
    where: { deletedAt: null },
    orderBy: { displayOrder: 'asc' },
    include: { prices: { orderBy: { validFrom: 'desc' }, take: 10 } },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    include: {
      mediaAsset: {
        select: {
          id: true,
          key: true,
          originalName: true,
          width: true,
          height: true,
          blurDataUrl: true,
          altText: true,
          variants: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  /** Ommaviy javoblar keshi muddati. */
  private static readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  /** Rasm variantlari uchun ommaviy manzil. */
  private readonly url = (key: string): string => this.storage.publicUrl(key);

  // ---------------------------------------------------------------------------
  // Ommaviy
  // ---------------------------------------------------------------------------

  /**
   * Ommaviy ro'yxat.
   *
   * Javobda ko'p tilli maydonlar TO'LIQ obyekt sifatida qaytadi
   * (`{ uz, ru, en }`), bitta til emas. Shu tufayli til almashtirilganda
   * qayta so'rov kerak bo'lmaydi va kesh ham bitta nusxada qoladi.
   */
  async listPublic(query: {
    page: number;
    limit: number;
    sortOrder?: 'asc' | 'desc' | undefined;
    categorySlug?: string | undefined;
    search?: string | undefined;
  }) {
    const request = toPageRequest(query);

    const cacheKey = `list:${request.page}:${request.limit}:${request.sortOrder}:${query.categorySlug ?? '-'}:${query.search ?? '-'}`;

    return this.cache.wrap('products', cacheKey, ProductsService.CACHE_TTL_SECONDS, async () => {
      return this.loadPublicList(query, request);
    });
  }

  private async loadPublicList(
    query: { categorySlug?: string | undefined; search?: string | undefined },
    request: ReturnType<typeof toPageRequest>,
  ) {
    const where: Prisma.ProductWhereInput = {
      ...PUBLIC_PRODUCT_WHERE,
      ...(query.categorySlug !== undefined
        ? { category: { slug: query.categorySlug, isActive: true, deletedAt: null } }
        : {}),
      ...(query.search !== undefined
        ? {
            // JSON ichidan qidirish: nom uchala tilda ham tekshiriladi.
            OR: [
              { name: { path: ['uz'], string_contains: query.search } },
              { name: { path: ['ru'], string_contains: query.search } },
              { name: { path: ['en'], string_contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: request.sortOrder }],
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Prisma qatori EMAS, aniq tuzilgan javob: yangi ustun qo'shilsa,
    // u o'z-o'zidan ommaviy API'ga chiqib ketmaydi.
    return paginate(
      items.map((item) => toPublicProduct(item, this.url)),
      total,
      request,
    );
  }

  async findBySlugPublic(slug: string) {
    return this.cache.wrap(
      'products',
      `slug:${slug}`,
      ProductsService.CACHE_TTL_SECONDS,
      async () => {
        const product = await this.prisma.product.findFirst({
          where: { slug, ...PUBLIC_PRODUCT_WHERE },
          include: PUBLIC_INCLUDE,
        });

        if (product === null) {
          throw new NotFoundException({ message: 'Mahsulot topilmadi', code: 'PRODUCT_NOT_FOUND' });
        }

        return toPublicProduct(product, this.url);
      },
    );
  }

  async listPublicCategories() {
    return this.cache.wrap('products', 'categories', ProductsService.CACHE_TTL_SECONDS, () =>
      this.prisma.productCategory.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { displayOrder: 'asc' },
        select: { slug: true, name: true, description: true, parentId: true },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  /** Admin ro'yxati — faol bo'lmaganlar ham ko'rinadi. */
  async listAdmin(query: { page: number; limit: number; sortOrder?: 'asc' | 'desc' | undefined }) {
    const request = toPageRequest(query);

    const where: Prisma.ProductWhereInput = { deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, slug: true, name: true } },
          variants: {
            where: { deletedAt: null },
            select: {
              id: true,
              isActive: true,
              prices: { orderBy: { validFrom: 'desc' }, take: 1 },
            },
          },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            take: 1,
            include: { mediaAsset: ADMIN_INCLUDE.images.include.mediaAsset },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: request.sortOrder }],
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(
      items.map((item) => {
        const amounts = item.variants
          .map((variant) => variant.prices[0]?.amount)
          .filter((amount): amount is number => amount !== undefined);

        return {
          id: item.id,
          slug: item.slug,
          sku: item.sku,
          name: item.name,
          isActive: item.isActive,
          category: item.category,
          variantCount: item.variants.length,
          priceFrom: amounts.length > 0 ? Math.min(...amounts) : null,
          priceTo: amounts.length > 0 ? Math.max(...amounts) : null,
          thumbnail: toPublicImage(item.images[0]?.mediaAsset, this.url),
        };
      }),
      total,
      request,
    );
  }

  /**
   * Muharrir uchun to'liq mahsulot: HAMMA variantlar, narxlar tarixi va
   * rasmlar (media `id` bilan — o'chirish/asosiy qilish uchun kerak).
   */
  async findDetailAdmin(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: ADMIN_INCLUDE,
    });

    if (product === null) {
      throw new NotFoundException({ message: 'Mahsulot topilmadi', code: 'PRODUCT_NOT_FOUND' });
    }

    const { variants, images, ...rest } = product;

    return {
      ...rest,
      variants: variants.map((variant) => ({
        ...variant,
        currentPrice: variant.prices[0] ?? null,
      })),
      images: images.map((image) => ({
        id: image.id,
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
        mediaAssetId: image.mediaAssetId,
        originalName: image.mediaAsset.originalName,
        image: toPublicImage(image.mediaAsset, this.url),
      })),
    };
  }

  async findByIdAdmin(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PUBLIC_INCLUDE,
    });

    if (product === null) {
      throw new NotFoundException({ message: 'Mahsulot topilmadi', code: 'PRODUCT_NOT_FOUND' });
    }

    return product;
  }

  async create(data: Prisma.ProductUncheckedCreateInput, actor: Actor, ctx: RequestContext) {
    await this.assertCategoryExists(data.categoryId);

    const product = await this.runUnique(() => this.prisma.product.create({ data }));

    // Kesh javob qaytarilishidan OLDIN bekor qilinadi — shunda keyingi
    // so'rov yangi ma'lumotni oladi (DoD: bir so'rov siklida).
    await this.cache.invalidate('products');

    await this.audit.record({
      action: AUDIT_ACTIONS.PRODUCT_CREATED,
      entity: 'Product',
      entityId: product.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { slug: product.slug, sku: product.sku },
      ...ctx,
    });

    return product;
  }

  async update(
    id: string,
    data: Prisma.ProductUncheckedUpdateInput,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const before = await this.findByIdAdmin(id);

    if (typeof data.categoryId === 'string') {
      await this.assertCategoryExists(data.categoryId);
    }

    const product = await this.runUnique(() => this.prisma.product.update({ where: { id }, data }));

    await this.cache.invalidate('products');

    await this.audit.record({
      action: AUDIT_ACTIONS.PRODUCT_UPDATED,
      entity: 'Product',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { slug: before.slug, sku: before.sku, isActive: before.isActive },
      after: { slug: product.slug, sku: product.sku, isActive: product.isActive },
      ...ctx,
    });

    return product;
  }

  /**
   * Yumshoq o'chirish.
   *
   * Mahsulot buyurtmalarda havola qilingan bo'lishi mumkin — yozuvni
   * fizik o'chirish tarixni buzardi. Ommaviy API `deletedAt` ni
   * hisobga oladi, shuning uchun sayt uchun u yo'q bo'ladi.
   */
  async softDelete(id: string, actor: Actor, ctx: RequestContext) {
    const product = await this.findByIdAdmin(id);

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.cache.invalidate('products');

    await this.audit.record({
      action: AUDIT_ACTIONS.PRODUCT_DELETED,
      entity: 'Product',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { slug: product.slug, sku: product.sku },
      ...ctx,
    });
  }

  // --- Variantlar -------------------------------------------------------------

  async addVariant(
    productId: string,
    data: Omit<Prisma.ProductVariantUncheckedCreateInput, 'productId'>,
    actor: Actor | undefined,
    ctx: RequestContext,
  ) {
    await this.findByIdAdmin(productId);
    const variant = await this.runUnique(() =>
      this.prisma.productVariant.create({ data: { ...data, productId } }),
    );
    // Variant mahsulot javobining bir qismi — kesh eskiradi.
    await this.cache.invalidate('products');

    await this.recordVariant(AUDIT_ACTIONS.PRODUCT_VARIANT_CREATED, variant, undefined, actor, ctx);

    return variant;
  }

  async updateVariant(
    id: string,
    data: Prisma.ProductVariantUncheckedUpdateInput,
    actor: Actor | undefined,
    ctx: RequestContext,
  ) {
    const before = await this.assertVariantExists(id);
    const variant = await this.runUnique(() =>
      this.prisma.productVariant.update({ where: { id }, data }),
    );
    await this.cache.invalidate('products');

    await this.recordVariant(AUDIT_ACTIONS.PRODUCT_VARIANT_UPDATED, variant, before, actor, ctx);

    return variant;
  }

  /**
   * Narx qo'shish — CLAUDE.md §23: narx o'zgarishi AUDIT qilinadigan amal.
   *
   * Eski narx o'chirilmaydi (yangi qator qo'shiladi), shuning uchun
   * jurnalda oldingi faol narx ham `before` sifatida yoziladi: "narx
   * qachon va kim tomonidan 12 000 dan 13 500 ga o'zgardi" savoliga
   * javob jurnalning o'zidan olinadi.
   */
  async addPrice(
    variantId: string,
    data: Omit<Prisma.ProductPriceUncheckedCreateInput, 'variantId'>,
    actor: Actor | undefined,
    ctx: RequestContext,
  ) {
    const variant = await this.assertVariantExists(variantId);

    const previous = await this.prisma.productPrice.findFirst({
      where: { variantId, validTo: null },
      orderBy: { validFrom: 'desc' },
      select: { amount: true, currency: true },
    });

    const price = await this.prisma.productPrice.create({ data: { ...data, variantId } });
    // Narx o'zgarishi eng sezgir holat: eski narx ko'rinib turishi mumkin emas.
    await this.cache.invalidate('products');

    await this.audit.record({
      action: AUDIT_ACTIONS.PRODUCT_PRICE_CHANGED,
      entity: 'ProductVariant',
      entityId: variantId,
      ...(actor !== undefined ? { actorId: actor.id, actorEmail: actor.email } : {}),
      before: previous,
      after: { sku: variant.sku, amount: price.amount, currency: price.currency },
      ...ctx,
    });

    return price;
  }

  private async recordVariant(
    action: string,
    variant: { id: string; sku: string; volumeMl: number; isActive: boolean },
    before: { sku: string; volumeMl: number; isActive: boolean } | undefined,
    actor: Actor | undefined,
    ctx: RequestContext,
  ): Promise<void> {
    const pick = (v: { sku: string; volumeMl: number; isActive: boolean }) => ({
      sku: v.sku,
      volumeMl: v.volumeMl,
      isActive: v.isActive,
    });

    await this.audit.record({
      action,
      entity: 'ProductVariant',
      entityId: variant.id,
      ...(actor !== undefined ? { actorId: actor.id, actorEmail: actor.email } : {}),
      ...(before !== undefined ? { before: pick(before) } : {}),
      after: pick(variant),
      ...ctx,
    });
  }

  // --- Rasmlar ----------------------------------------------------------------

  /**
   * Mahsulotga rasm biriktiradi.
   *
   * Faqat OMMAVIY RASM qabul qilinadi: maxfiy fayl saytda ko'rinmaydi
   * (havolasi muddatli), PDF esa rasm emas. Xatoni biriktirish paytida
   * aytgan ma'qul — aks holda mahsulot sahifasida jim "bo'sh ramka" chiqadi.
   *
   * Birinchi biriktirilgan rasm o'zi asosiy bo'ladi: aks holda yangi
   * mahsulot ro'yxatda rasmsiz turardi.
   */
  async addImage(
    productId: string,
    data: { mediaAssetId: string; isPrimary: boolean; displayOrder: number },
    actor: Actor | undefined,
    ctx: RequestContext,
  ) {
    await this.findByIdAdmin(productId);

    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: data.mediaAssetId, deletedAt: null },
      select: { id: true, kind: true, visibility: true },
    });

    if (asset === null) {
      throw new NotFoundException({ message: 'Fayl topilmadi', code: 'MEDIA_NOT_FOUND' });
    }

    if (asset.kind !== MediaKind.IMAGE || asset.visibility !== MediaVisibility.PUBLIC) {
      throw new ConflictException({
        message: 'Mahsulotga faqat ommaviy rasm biriktiriladi',
        code: 'MEDIA_NOT_PUBLIC_IMAGE',
      });
    }

    const image = await this.runUnique(() =>
      this.prisma.$transaction(async (tx) => {
        const hasPrimary =
          (await tx.productImage.count({ where: { productId, isPrimary: true } })) > 0;
        const isPrimary = data.isPrimary || !hasPrimary;

        if (isPrimary) {
          await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
        }

        return tx.productImage.create({
          data: {
            productId,
            mediaAssetId: data.mediaAssetId,
            isPrimary,
            displayOrder: data.displayOrder,
          },
        });
      }),
    );

    await this.cache.invalidate('products');
    await this.recordImage(AUDIT_ACTIONS.PRODUCT_IMAGE_ADDED, image, actor, ctx);

    return image;
  }

  async updateImage(
    imageId: string,
    data: { isPrimary?: boolean; displayOrder?: number },
    actor: Actor | undefined,
    ctx: RequestContext,
  ) {
    const current = await this.findImage(imageId);

    // Asosiy rasmni "olib tashlash" mumkin emas — mahsulotda har doim
    // bittasi asosiy bo'lishi kerak. Boshqa rasmni asosiy qilish eskisini
    // o'zi tushiradi.
    if (data.isPrimary === false && current.isPrimary) {
      throw new ConflictException({
        message: 'Asosiy rasmni olib tashlab bo‘lmaydi — boshqa rasmni asosiy qiling',
        code: 'PRIMARY_IMAGE_REQUIRED',
      });
    }

    const image = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary === true) {
        await tx.productImage.updateMany({
          where: { productId: current.productId },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.update({ where: { id: imageId }, data });
    });

    await this.cache.invalidate('products');
    await this.recordImage(AUDIT_ACTIONS.PRODUCT_IMAGE_UPDATED, image, actor, ctx);

    return image;
  }

  async removeImage(imageId: string, actor: Actor | undefined, ctx: RequestContext) {
    const current = await this.findImage(imageId);

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      // Asosiy rasm o'chsa, qolganidan birinchisi o'rnini egallaydi.
      if (current.isPrimary) {
        const next = await tx.productImage.findFirst({
          where: { productId: current.productId },
          orderBy: { displayOrder: 'asc' },
        });

        if (next !== null) {
          await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }
    });

    await this.cache.invalidate('products');
    await this.recordImage(AUDIT_ACTIONS.PRODUCT_IMAGE_REMOVED, current, actor, ctx);
  }

  private async findImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });

    if (image === null) {
      throw new NotFoundException({ message: 'Rasm topilmadi', code: 'PRODUCT_IMAGE_NOT_FOUND' });
    }

    return image;
  }

  private async recordImage(
    action: string,
    image: { id: string; productId: string; mediaAssetId: string; isPrimary: boolean },
    actor: Actor | undefined,
    ctx: RequestContext,
  ): Promise<void> {
    await this.audit.record({
      action,
      entity: 'ProductImage',
      entityId: image.id,
      ...(actor !== undefined ? { actorId: actor.id, actorEmail: actor.email } : {}),
      after: {
        productId: image.productId,
        mediaAssetId: image.mediaAssetId,
        isPrimary: image.isPrimary,
      },
      ...ctx,
    });
  }

  // --- Yordamchilar -----------------------------------------------------------

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
    });

    if (category === null) {
      throw new NotFoundException({ message: 'Kategoriya topilmadi', code: 'CATEGORY_NOT_FOUND' });
    }
  }

  private async assertVariantExists(id: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, deletedAt: null } });

    if (variant === null) {
      throw new NotFoundException({ message: 'Variant topilmadi', code: 'VARIANT_NOT_FOUND' });
    }

    return variant;
  }

  private runUnique<T>(operation: () => Promise<T>): Promise<T> {
    return runUnique(operation);
  }
}

interface Actor {
  id: string;
  email: string;
}
