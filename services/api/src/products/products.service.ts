import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';

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
        select: { id: true, key: true, width: true, height: true, blurDataUrl: true, variants: true },
      },
    },
  },
  documents: {
    orderBy: { displayOrder: 'asc' },
    include: { mediaAsset: { select: { id: true, key: true, mimeType: true, byteSize: true } } },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

    return paginate(items, total, request);
  }

  async findBySlugPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...PUBLIC_PRODUCT_WHERE },
      include: PUBLIC_INCLUDE,
    });

    if (product === null) {
      throw new NotFoundException({ message: 'Mahsulot topilmadi', code: 'PRODUCT_NOT_FOUND' });
    }

    return product;
  }

  async listPublicCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, slug: true, name: true, description: true, parentId: true },
    });
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
        include: { category: { select: { id: true, slug: true, name: true } }, variants: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: request.sortOrder }],
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(items, total, request);
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

    const product = await this.runUnique(() =>
      this.prisma.product.create({ data }),
    );

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

    const product = await this.runUnique(() =>
      this.prisma.product.update({ where: { id }, data }),
    );

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

  async addVariant(productId: string, data: Omit<Prisma.ProductVariantUncheckedCreateInput, 'productId'>) {
    await this.findByIdAdmin(productId);
    return this.runUnique(() =>
      this.prisma.productVariant.create({ data: { ...data, productId } }),
    );
  }

  async updateVariant(id: string, data: Prisma.ProductVariantUncheckedUpdateInput) {
    await this.assertVariantExists(id);
    return this.runUnique(() => this.prisma.productVariant.update({ where: { id }, data }));
  }

  async addPrice(variantId: string, data: Omit<Prisma.ProductPriceUncheckedCreateInput, 'variantId'>) {
    await this.assertVariantExists(variantId);
    return this.prisma.productPrice.create({ data: { ...data, variantId } });
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

  private async assertVariantExists(id: string): Promise<void> {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, deletedAt: null } });

    if (variant === null) {
      throw new NotFoundException({ message: 'Variant topilmadi', code: 'VARIANT_NOT_FOUND' });
    }
  }

  /**
   * Unikallik xatosini tushunarli javobga aylantiradi.
   *
   * Prisma `P2002` ni qaytaradi; uni ushlamasak, mijoz `500` olardi va
   * qaysi maydon takrorlanganini bilmasdi.
   */
  private async runUnique<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.['target'];
        const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'maydon');

        throw new ConflictException({
          message: `Bu qiymat allaqachon band: ${fields}`,
          code: 'DUPLICATE_VALUE',
          details: { [fields]: ['Bu qiymat allaqachon ishlatilgan'] },
        });
      }
      throw error;
    }
  }
}

interface Actor {
  id: string;
  email: string;
}
