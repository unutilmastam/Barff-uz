import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type StockMovementType } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  email: string;
}

/**
 * Harakat yozilganda qaytadigan maydonlar.
 *
 * `quantityAfter` va `reservedAfter` ni BAZA yozadi (trigger),
 * shuning uchun ular qayta o'qiladi — ilovada hisoblangan qiymat
 * poygada haqiqatdan ajralib ketardi.
 */
const MOVEMENT_SELECT = {
  id: true,
  type: true,
  quantity: true,
  quantityAfter: true,
  reservedAfter: true,
  reason: true,
  reference: true,
  createdAt: true,
  warehouse: { select: { id: true, code: true, name: true } },
  relatedWarehouse: { select: { id: true, code: true, name: true } },
  productVariant: {
    select: {
      id: true,
      sku: true,
      volumeMl: true,
      product: { select: { id: true, slug: true, name: true } },
    },
  },
  actor: { select: { id: true, fullName: true } },
} as const;

const STOCK_SELECT = {
  id: true,
  quantity: true,
  reservedQuantity: true,
  lowStockThreshold: true,
  updatedAt: true,
  warehouse: { select: { id: true, code: true, name: true, region: true } },
  productVariant: {
    select: {
      id: true,
      sku: true,
      volumeMl: true,
      unitsPerPack: true,
      product: { select: { id: true, slug: true, name: true } },
    },
  },
} as const;

/**
 * Ombor va qoldiqlar (CLAUDE.md §7).
 *
 * ==========================================================
 * QOLDIQ BU YERDA HISOBLANMAYDI
 * ==========================================================
 *
 * Servis FAQAT `stock_movements` ga qator qo'shadi. Qoldiqni
 * bazadagi trigger yangilaydi va `warehouse_stock` ni
 * to'g'ridan-to'g'ri o'zgartirish REDD ETILADI (migratsiyaga
 * qarang).
 *
 * Nega shunday: "o'qi -> hisobla -> yoz" yondashuvida bir vaqtda
 * kelgan ikki harakat birini YO'QOTARDI, va har qanday yangi kod
 * qoldiqni jurnalsiz o'zgartira olardi. Omborchi keyin raqamni
 * ko'radi, lekin uning qayerdan kelganini hech kim ayta olmaydi.
 *
 * Shu sababli bu yerda `warehouseStock.update` CHAQIRUVI YO'Q va
 * bo'lmasligi kerak — u baribir xato beradi.
 */
@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ===========================================================================
  // OMBORLAR
  // ===========================================================================

  listWarehouses(includeInactive = false) {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        region: true,
        address: true,
        notes: true,
        isActive: true,
        isDefault: true,
      },
    });
  }

  async createWarehouse(
    input: {
      code: string;
      name: string;
      region: string;
      address?: string | undefined;
      notes?: string | undefined;
      isActive?: boolean | undefined;
      isDefault?: boolean | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const warehouse = await this.prisma
      .$transaction(async (tx) => {
        // Standart ombor YAGONA: bazada ham qisman indeks bor, lekin
        // eskisini o'chirmasdan yangisini yozish `409` berardi.
        if (input.isDefault === true) await this.clearDefault(tx);

        return tx.warehouse.create({
          data: {
            code: input.code,
            name: input.name,
            region: input.region,
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          },
          select: { id: true, code: true, name: true, region: true, isDefault: true },
        });
      })
      .catch((error: unknown) => {
        throw this.mapUniqueError(error);
      });

    await this.audit.record({
      action: AUDIT_ACTIONS.WAREHOUSE_CHANGED,
      entity: 'warehouse',
      entityId: warehouse.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { code: warehouse.code, name: warehouse.name, region: warehouse.region },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return warehouse;
  }

  async updateWarehouse(
    id: string,
    input: {
      code?: string | undefined;
      name?: string | undefined;
      region?: string | undefined;
      address?: string | undefined;
      notes?: string | undefined;
      isActive?: boolean | undefined;
      isDefault?: boolean | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const before = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, code: true, name: true, region: true, isActive: true, isDefault: true },
    });

    if (before === null) {
      throw new NotFoundException({ message: 'Ombor topilmadi', code: 'WAREHOUSE_NOT_FOUND' });
    }

    /*
      Berilmagan maydon TEGILMAYDI.

      `exactOptionalPropertyTypes` yoqilgan, ya'ni `{ code: undefined }`
      ni Prisma'ga uzatib bo'lmaydi — u "qiymatni o'chir" degan
      ma'noda tushunilardi.
    */
    const data: Prisma.WarehouseUpdateInput = {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.region !== undefined ? { region: input.region } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    };

    const updated = await this.prisma
      .$transaction(async (tx) => {
        if (input.isDefault === true) await this.clearDefault(tx, id);

        return tx.warehouse.update({
          where: { id },
          data,
          select: {
            id: true,
            code: true,
            name: true,
            region: true,
            isActive: true,
            isDefault: true,
          },
        });
      })
      .catch((error: unknown) => {
        throw this.mapUniqueError(error);
      });

    await this.audit.record({
      action: AUDIT_ACTIONS.WAREHOUSE_CHANGED,
      entity: 'warehouse',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before,
      after: updated,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  /** Standart bayrog'ini boshqa omborlardan olib tashlaydi. */
  private async clearDefault(tx: Prisma.TransactionClient, exceptId?: string): Promise<void> {
    await tx.warehouse.updateMany({
      where: {
        isDefault: true,
        deletedAt: null,
        ...(exceptId !== undefined ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  private mapUniqueError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = JSON.stringify(error.meta?.['target'] ?? '');

      if (target.includes('code')) {
        return new ConflictException({ message: 'Bu kod band', code: 'WAREHOUSE_CODE_EXISTS' });
      }
    }

    return error;
  }

  // ===========================================================================
  // QOLDIQ
  // ===========================================================================

  async listStock(query: {
    page: number;
    limit: number;
    warehouseId?: string | undefined;
    productVariantId?: string | undefined;
    search?: string | undefined;
    lowOnly?: boolean | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.WarehouseStockWhereInput = {
      warehouse: { deletedAt: null },
      ...(query.warehouseId !== undefined ? { warehouseId: query.warehouseId } : {}),
      ...(query.productVariantId !== undefined ? { productVariantId: query.productVariantId } : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            productVariant: {
              OR: [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { product: { slug: { contains: query.search, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.warehouseStock.findMany({
        where,
        orderBy: [{ productVariant: { sku: 'asc' } }],
        skip: request.skip,
        take: request.take,
        select: STOCK_SELECT,
      }),
      this.prisma.warehouseStock.count({ where }),
    ]);

    /*
      KAM QOLGANLAR FILTRI MIJOZDA EMAS, LEKIN SAHIFALASHDAN KEYIN.

      "Kam" degani `quantity - reservedQuantity <= lowStockThreshold`
      — ikki ustunning AYIRMASI bo'yicha shart. Prisma buni
      `where` da ifodalay olmaydi (xom SQL kerak bo'lardi), shuning
      uchun filtr shu yerda qo'llanadi va BU CHEKLOV ochiq aytiladi:
      sahifa ichidagi qatorlar filtrlanadi, jami soni esa
      filtrlanmagan holatniki.

      Xodim uchun bu yetarli — ro'yxat qisqa va u odatda bitta
      ombor bo'yicha qaraladi. Jadval kattalashsa, bu xom SQL
      bilan almashtiriladi (S37 hisobotlari bilan birga).
    */
    const filtered =
      query.lowOnly === true
        ? items.filter(
            (row) =>
              row.lowStockThreshold !== null &&
              row.quantity - row.reservedQuantity <= row.lowStockThreshold,
          )
        : items;

    return paginate(filtered, total, request);
  }

  async setLowStockThreshold(
    warehouseId: string,
    productVariantId: string,
    threshold: number | null,
    actor: Actor,
    ctx: RequestContext,
  ) {
    /*
      QOLDIQ EMAS — shuning uchun to'g'ridan-to'g'ri yoziladi.

      Bazadagi qo'riqchi FAQAT `quantity` va `reservedQuantity`
      ustunlarini kuzatadi (`BEFORE UPDATE OF ...`), ya'ni bu
      chaqiruv rad etilmaydi.
    */
    const stock = await this.prisma.warehouseStock.upsert({
      where: { warehouseId_productVariantId: { warehouseId, productVariantId } },
      create: { warehouseId, productVariantId, lowStockThreshold: threshold },
      update: { lowStockThreshold: threshold },
      select: STOCK_SELECT,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STOCK_THRESHOLD_CHANGED,
      entity: 'warehouse_stock',
      entityId: stock.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { lowStockThreshold: threshold },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return stock;
  }

  // ===========================================================================
  // HARAKATLAR
  // ===========================================================================

  async listMovements(query: {
    page: number;
    limit: number;
    warehouseId?: string | undefined;
    productVariantId?: string | undefined;
    type?: StockMovementType | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.StockMovementWhereInput = {
      ...(query.warehouseId !== undefined ? { warehouseId: query.warehouseId } : {}),
      ...(query.productVariantId !== undefined ? { productVariantId: query.productVariantId } : {}),
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            createdAt: {
              ...(query.from !== undefined ? { gte: query.from } : {}),
              // Sana filtri KUN OXIRIGACHA — S28 dagi bilan bir xil
              // sabab: `to` = bugun berilsa bugungi harakatlar
              // tushib qolardi.
              ...(query.to !== undefined ? { lte: endOfDay(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: MOVEMENT_SELECT,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  /**
   * Qo'lda harakat yozish.
   *
   * Yagona vazifasi — jurnalga qator qo'shish. Qoldiqni trigger
   * hisoblaydi va mumkin bo'lmagan holatni (manfiy qoldiq, qoldiqdan
   * ko'p band) BAZA rad etadi. Shu sababli bu yerda "yetarli
   * qoldiq bormi" degan OLDINDAN tekshiruv ATAYLAB yo'q: u poygada
   * baribir noto'g'ri javob berardi.
   */
  async recordMovement(
    input: {
      warehouseId: string;
      productVariantId: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
      quantity: number;
      reason?: string | undefined;
      reference?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    await this.requireWarehouse(input.warehouseId);
    await this.requireVariant(input.productVariantId);

    const movement = await this.prisma.stockMovement
      .create({
        data: {
          warehouseId: input.warehouseId,
          productVariantId: input.productVariantId,
          type: input.type,
          quantity: input.quantity,
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.reference !== undefined ? { reference: input.reference } : {}),
          actorId: actor.id,
        },
        select: MOVEMENT_SELECT,
      })
      .catch((error: unknown) => {
        throw this.mapStockError(error);
      });

    await this.audit.record({
      action:
        input.type === 'ADJUSTMENT' ? AUDIT_ACTIONS.STOCK_ADJUSTED : AUDIT_ACTIONS.STOCK_MOVED,
      entity: 'stock_movement',
      entityId: movement.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: {
        type: input.type,
        quantity: input.quantity,
        quantityAfter: movement.quantityAfter,
        reason: input.reason ?? null,
      },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return movement;
  }

  /**
   * Omborlar orasida ko'chirish — IKKITA qator, BITTA tranzaksiya.
   *
   * Chiquvchi tomon manfiy, kiruvchi musbat. Ikkalasi bir
   * tranzaksiyada: chiqim yozilib kirim yozilmasa, tovar
   * YO'QOLARDI.
   */
  async transfer(
    input: {
      fromWarehouseId: string;
      toWarehouseId: string;
      productVariantId: string;
      quantity: number;
      reason?: string | undefined;
      reference?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    await Promise.all([
      this.requireWarehouse(input.fromWarehouseId),
      this.requireWarehouse(input.toWarehouseId),
      this.requireVariant(input.productVariantId),
    ]);

    const common = {
      productVariantId: input.productVariantId,
      type: 'TRANSFER' as const,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.reference !== undefined ? { reference: input.reference } : {}),
      actorId: actor.id,
    };

    const result = await this.prisma
      .$transaction(async (tx) => {
        const out = await tx.stockMovement.create({
          data: {
            ...common,
            warehouseId: input.fromWarehouseId,
            relatedWarehouseId: input.toWarehouseId,
            quantity: -input.quantity,
          },
          select: MOVEMENT_SELECT,
        });

        const incoming = await tx.stockMovement.create({
          data: {
            ...common,
            warehouseId: input.toWarehouseId,
            relatedWarehouseId: input.fromWarehouseId,
            quantity: input.quantity,
          },
          select: MOVEMENT_SELECT,
        });

        return { out, in: incoming };
      })
      .catch((error: unknown) => {
        throw this.mapStockError(error);
      });

    await this.audit.record({
      action: AUDIT_ACTIONS.STOCK_MOVED,
      entity: 'stock_movement',
      entityId: result.out.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: {
        type: 'TRANSFER',
        quantity: input.quantity,
        from: input.fromWarehouseId,
        to: input.toWarehouseId,
      },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return result;
  }

  private async requireWarehouse(id: string): Promise<void> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (warehouse === null) {
      throw new NotFoundException({
        message: 'Ombor topilmadi yoki faol emas',
        code: 'WAREHOUSE_NOT_FOUND',
      });
    }
  }

  private async requireVariant(id: string): Promise<void> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (variant === null) {
      throw new NotFoundException({ message: 'Variant topilmadi', code: 'VARIANT_NOT_FOUND' });
    }
  }

  /**
   * Bazadagi qoidaning buzilishini FOYDALANUVCHI TILIGA o'giradi.
   *
   * O'LCHAB ANIQLANGAN: Prisma trigger xatosini
   * `PrismaClientUnknownRequestError` qilib beradi va `code` ham,
   * `meta` ham BO'SH bo'ladi — ya'ni `23514` SQLSTATE ilovaga yetib
   * kelmaydi. Men avval uni `PrismaClientKnownRequestError` deb
   * taxmin qilgan edim va o'sha shox O'LIK kod bo'lardi.
   *
   * Shu sababli trigger har bir xatoni BARQAROR kod bilan
   * boshlaydi (`BARFF_STOCK_...`) va bu yerda o'sha kod
   * qidiriladi — xabarning o'zbekcha qismiga tayanish uni
   * tarjima qilganda jimgina buzardi.
   *
   * Xabarni SHUNDAYLIGICHA `500` qilib yuborish omborchiga "server
   * xatosi" deb ko'rinardi, aslida bu uning kiritgan raqami
   * haqidagi ANIQ javob.
   */
  private mapStockError(error: unknown): unknown {
    const message = error instanceof Error ? error.message : '';

    const mapped: Record<string, { message: string; code: string }> = {
      BARFF_STOCK_INSUFFICIENT: {
        message: 'Omborda yetarli qoldiq yo‘q',
        code: 'STOCK_INSUFFICIENT',
      },
      BARFF_STOCK_RESERVED_EXCEEDS: {
        message: 'Band qilingan miqdor qoldiqdan oshib ketadi',
        code: 'STOCK_RESERVED_EXCEEDS',
      },
      BARFF_STOCK_RELEASE_EXCEEDS: {
        message: 'Bo‘shatilayotgan miqdor band qilingandan ko‘p',
        code: 'STOCK_RELEASE_EXCEEDS',
      },
      BARFF_STOCK_REASON_REQUIRED: {
        message: 'Tuzatish uchun sabab kiritilishi shart',
        code: 'STOCK_REASON_REQUIRED',
      },
      BARFF_STOCK_ZERO_QUANTITY: {
        message: 'Miqdor nol bo‘lishi mumkin emas',
        code: 'STOCK_ZERO_QUANTITY',
      },
    };

    for (const [marker, response] of Object.entries(mapped)) {
      if (message.includes(marker)) return new BadRequestException(response);
    }

    /*
      `BARFF_STOCK_DIRECT_WRITE` va `BARFF_STOCK_LEDGER_IMMUTABLE`
      ATAYLAB o'girilmaydi. Ular foydalanuvchi xatosi emas —
      ular KOD xatosi: kimdir qoldiqni jurnalsiz o'zgartirmoqchi
      bo'lgan. Bunday holat `500` bo'lib jurnalga tushishi va
      tuzatilishi kerak, chiroyli xabar bilan yashirilishi emas.
    */
    return error;
  }
}

/** Sana filtri kun oxirigacha (S28 bilan bir xil). */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}
