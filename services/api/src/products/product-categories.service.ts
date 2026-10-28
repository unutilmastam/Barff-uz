import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../public/cache/cache.service';
import { runUnique } from '../common/run-unique';

interface Actor {
  id: string;
  email: string;
}

/**
 * Mahsulot kategoriyalari (admin).
 *
 * Kategoriya o'chirilganda unga bog'langan mahsulotlar "yetim" bo'lib
 * qolmasligi kerak, shuning uchun mahsuloti yoki ichki kategoriyasi bor
 * kategoriyani o'chirib bo'lmaydi — avval ularni ko'chirish kerak.
 */
@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  async list(query: { page: number; limit: number; sortOrder?: 'asc' | 'desc' | undefined }) {
    const request = toPageRequest(query);
    const where: Prisma.ProductCategoryWhereInput = { deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        skip: request.skip,
        take: request.take,
        include: { _count: { select: { products: { where: { deletedAt: null } } } } },
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return paginate(
      items.map(({ _count, ...category }) => ({ ...category, productCount: _count.products })),
      total,
      request,
    );
  }

  async create(
    data: Prisma.ProductCategoryUncheckedCreateInput,
    actor: Actor,
    ctx: RequestContext,
  ) {
    if (typeof data.parentId === 'string') await this.assertParent(data.parentId);

    const category = await runUnique(() => this.prisma.productCategory.create({ data }));
    await this.cache.invalidate('products');

    await this.record(AUDIT_ACTIONS.CATEGORY_CREATED, category, undefined, actor, ctx);

    return category;
  }

  async update(
    id: string,
    data: Prisma.ProductCategoryUncheckedUpdateInput,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const before = await this.find(id);

    if (typeof data.parentId === 'string') await this.assertParent(data.parentId, id);

    const category = await runUnique(() =>
      this.prisma.productCategory.update({ where: { id }, data }),
    );
    await this.cache.invalidate('products');

    await this.record(AUDIT_ACTIONS.CATEGORY_UPDATED, category, before, actor, ctx);

    return category;
  }

  async softDelete(id: string, actor: Actor, ctx: RequestContext): Promise<void> {
    const category = await this.find(id);

    const [products, children] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.productCategory.count({ where: { parentId: id, deletedAt: null } }),
    ]);

    if (products > 0 || children > 0) {
      throw new ConflictException({
        message:
          "Kategoriyada mahsulot yoki ichki kategoriya bor — avval ularni boshqasiga ko'chiring",
        code: 'CATEGORY_NOT_EMPTY',
        details: { products, children },
      });
    }

    await this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.cache.invalidate('products');

    await this.record(AUDIT_ACTIONS.CATEGORY_DELETED, category, category, actor, ctx);
  }

  private async find(id: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (category === null) {
      throw new NotFoundException({ message: 'Kategoriya topilmadi', code: 'CATEGORY_NOT_FOUND' });
    }

    return category;
  }

  /**
   * Ota kategoriya mavjud bo'lishi va TSIKL hosil qilmasligi shart:
   * A -> B -> A bo'lsa daraxt cheksiz aylanardi.
   */
  private async assertParent(parentId: string, selfId?: string): Promise<void> {
    let cursor: string | null = parentId;
    const seen = new Set<string>();

    while (cursor !== null) {
      if (cursor === selfId || seen.has(cursor)) {
        throw new ConflictException({
          message: "Kategoriyani o'zining ichki kategoriyasiga joylab bo'lmaydi",
          code: 'CATEGORY_CYCLE',
        });
      }
      seen.add(cursor);

      const row: { parentId: string | null } | null = await this.prisma.productCategory.findFirst({
        where: { id: cursor, deletedAt: null },
        select: { parentId: true },
      });

      if (row === null) {
        throw new NotFoundException({
          message: 'Ota kategoriya topilmadi',
          code: 'CATEGORY_NOT_FOUND',
        });
      }

      cursor = row.parentId;
    }
  }

  private async record(
    action: string,
    category: { id: string; slug: string; isActive: boolean; parentId: string | null },
    before: { slug: string; isActive: boolean; parentId: string | null } | undefined,
    actor: Actor,
    ctx: RequestContext,
  ): Promise<void> {
    const pick = (c: { slug: string; isActive: boolean; parentId: string | null }) => ({
      slug: c.slug,
      isActive: c.isActive,
      parentId: c.parentId,
    });

    await this.audit.record({
      action,
      entity: 'ProductCategory',
      entityId: category.id,
      actorId: actor.id,
      actorEmail: actor.email,
      ...(before !== undefined ? { before: pick(before) } : {}),
      ...(action === AUDIT_ACTIONS.CATEGORY_DELETED ? {} : { after: pick(category) }),
      ...ctx,
    });
  }
}
