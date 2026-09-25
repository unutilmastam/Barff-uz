import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  email: string;
}

/** Zaxira yetmagan pozitsiya — xodimga ANIQ javob uchun. */
export interface ShortfallLine {
  sku: string;
  required: number;
  available: number;
}

/**
 * Yetishmovchilikni XATO JAVOBIGA sig'adigan shaklga o'giradi.
 *
 * `details` ATAYLAB faqat `Record<string, string[]>` bo'la oladi —
 * xato filtri boshqa shaklni tashlab yuboradi (S02 dagi qaror:
 * javob shakli bitta bo'lsin). Men avval u yerga massiv obyekt
 * yuborgan edim va u JIMGINA yo'qoldi — sinov "undefined" ko'rdi.
 *
 * Shuning uchun har bir qator O'QILADIGAN matnga aylantiriladi:
 * xodim baribir uni ekranda o'qiydi, raqamni qayta ishlamaydi.
 */
function shortfallDetails(lines: ShortfallLine[]): Record<string, string[]> {
  return {
    shortfall: lines.map((line) => `${line.sku}: kerak ${line.required}, mavjud ${line.available}`),
  };
}

const RESERVATION_SELECT = {
  id: true,
  quantity: true,
  status: true,
  expiresAt: true,
  warehouse: { select: { id: true, code: true, name: true } },
  productVariant: { select: { id: true, sku: true, volumeMl: true } },
  orderItem: { select: { id: true, sku: true, productName: true, quantity: true } },
} as const;

/**
 * Zaxira, yig'ish va qadoqlash (CLAUDE.md §7, S31).
 *
 * SIYOSAT `docs/WAREHOUSE-POLICY.md` DA YOZILGAN va bu kod o'sha
 * hujjatning bajarilishi. Ikkalasi bir-biridan ajralib ketmasligi
 * kerak.
 *
 * Qisqacha:
 * - buyurtma TO'LIQ zaxiraga olinadi yoki UMUMAN olinmaydi;
 * - bitta buyurtma BITTA ombordan;
 * - tovar `PACKED` da ombordan chiqadi;
 * - `PACKED` da tartib qat'iy: avval `RELEASED`, keyin `OUT`.
 *
 * HADDAN ZIYOD ZAXIRALASH MUMKIN EMAS — va buni bu servis
 * ta'minlamaydi, BAZA ta'minlaydi: `reservedQuantity > quantity`
 * bo'lishi S30 dagi trigger bilan taqiqlangan. Bu yerdagi
 * tekshiruv faqat XODIMGA TUSHUNARLI javob berish uchun; poygada
 * u kechikib qolsa, baza baribir rad etadi.
 */
@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ===========================================================================
  // ZAXIRAGA OLISH
  // ===========================================================================

  /**
   * Buyurtmani zaxiraga oladi.
   *
   * Hammasi BITTA tranzaksiyada: uchta pozitsiyadan ikkitasi
   * zaxiralanib uchinchisi yiqilsa, buyurtma yarim zaxirada
   * qolardi va uni hech kim to'g'rilay olmasdi.
   */
  async reserveOrder(orderId: string, actor: Actor | null, ctx: RequestContext) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        number: true,
        items: { select: { id: true, variantId: true, sku: true, quantity: true } },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    if (order.items.length === 0) {
      throw new ConflictException({
        message: "Buyurtmada pozitsiya yo'q",
        code: 'ORDER_EMPTY',
      });
    }

    const existing = await this.prisma.stockReservation.count({
      where: { orderId, status: 'ACTIVE' },
    });

    if (existing > 0) {
      throw new ConflictException({
        message: 'Buyurtma allaqachon zaxiraga olingan',
        code: 'RESERVATION_EXISTS',
      });
    }

    const warehouseId = await this.pickWarehouse(order.items);

    const reservations = await this.prisma
      .$transaction(async (tx) => {
        const created = [];

        for (const item of order.items) {
          /*
            HARAKAT AVVAL — ZAXIRA KEYIN.

            `RESERVED` harakati bazadagi trigger orqali
            `reservedQuantity` ni oshiradi va agar u qoldiqdan
            oshib ketsa, TRANZAKSIYA shu yerda yiqiladi. Ya'ni
            zaxira qatori faqat qoldiq HAQIQATAN yetganda
            yaratiladi.
          */
          await tx.stockMovement.create({
            data: {
              warehouseId,
              productVariantId: item.variantId,
              type: 'RESERVED',
              quantity: item.quantity,
              reference: order.number,
              ...(actor !== null ? { actorId: actor.id } : {}),
            },
            select: { id: true },
          });

          created.push(
            await tx.stockReservation.create({
              data: {
                orderId,
                orderItemId: item.id,
                warehouseId,
                productVariantId: item.variantId,
                quantity: item.quantity,
              },
              select: RESERVATION_SELECT,
            }),
          );
        }

        return created;
      })
      .catch(async (error: unknown) => {
        throw await this.explainShortfall(error, warehouseId, order.items);
      });

    await this.audit.record({
      action: AUDIT_ACTIONS.STOCK_RESERVED,
      entity: 'order',
      entityId: orderId,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      after: { warehouseId, lines: reservations.length },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifyLowStock(
      warehouseId,
      order.items.map((item) => item.variantId),
    );

    return reservations;
  }

  /**
   * Buyurtmaning HAMMA pozitsiyasini qoplay oladigan ombor.
   *
   * Bitta ombor — `docs/WAREHOUSE-POLICY.md` §2. Ikki ombordan
   * yig'ilgan buyurtma ikkita jo'natma degani va yetkazib berish
   * domeni (S32) buyurtmaga BITTA yetkazmani bog'laydi.
   */
  private async pickWarehouse(
    items: { variantId: string; sku: string; quantity: number }[],
  ): Promise<string> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      select: { id: true, code: true, isDefault: true },
    });

    if (warehouses.length === 0) {
      throw new ConflictException({
        message: "Faol ombor yo'q",
        code: 'WAREHOUSE_NONE',
      });
    }

    const stock = await this.prisma.warehouseStock.findMany({
      where: {
        warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
        productVariantId: { in: items.map((item) => item.variantId) },
      },
      select: {
        warehouseId: true,
        productVariantId: true,
        quantity: true,
        reservedQuantity: true,
      },
    });

    const availableIn = (warehouseId: string, variantId: string): number => {
      const row = stock.find(
        (entry) => entry.warehouseId === warehouseId && entry.productVariantId === variantId,
      );

      return row === undefined ? 0 : row.quantity - row.reservedQuantity;
    };

    const covers = warehouses.filter((warehouse) =>
      items.every((item) => availableIn(warehouse.id, item.variantId) >= item.quantity),
    );

    if (covers.length > 0) {
      /*
        Standart ombor BIRINCHI (ro'yxat shunday saralangan), aks
        holda eng ko'p mavjud qoldig'i bori — shunda keyingi
        buyurtmalarga ko'proq joy qoladi.
      */
      const best =
        covers.find((warehouse) => warehouse.isDefault) ??
        covers.reduce((a, b) => {
          const sum = (warehouse: { id: string }) =>
            items.reduce((acc, item) => acc + availableIn(warehouse.id, item.variantId), 0);

          return sum(b) > sum(a) ? b : a;
        });

      return best.id;
    }

    /*
      HECH BIR OMBOR QOPLAMADI — qisman bajarish YO'Q
      (`docs/WAREHOUSE-POLICY.md` §1).

      Javobda QAYSI pozitsiyaga QANCHA yetmagani ko'rsatiladi,
      aks holda xodim "qoldiq yetmadi" degan xabardan keyin har
      bir pozitsiyani qo'lda tekshirib chiqishi kerak bo'lardi.
      Eng yaqin ombor bo'yicha hisoblanadi.
    */
    const closest = warehouses.reduce((a, b) => {
      const gap = (warehouse: { id: string }) =>
        items.reduce(
          (acc, item) =>
            acc + Math.max(0, item.quantity - availableIn(warehouse.id, item.variantId)),
          0,
        );

      return gap(b) < gap(a) ? b : a;
    });

    const shortfall: ShortfallLine[] = items
      .map((item) => ({
        sku: item.sku,
        required: item.quantity,
        available: availableIn(closest.id, item.variantId),
      }))
      .filter((line) => line.available < line.required);

    throw new ConflictException({
      message: `Omborda yetarli qoldiq yo'q (${closest.code})`,
      code: 'STOCK_SHORTFALL',
      details: shortfallDetails(shortfall),
    });
  }

  /**
   * Bazadan kelgan poyga xatosini xodimga tushunarli qiladi.
   *
   * Yuqoridagi tekshiruv POYGAGACHA bo'lgan holatni ko'radi:
   * ikkita buyurtma bir vaqtda zaxiraga olinsa, ikkalasi ham
   * "yetadi" deb xulosa qilishi mumkin va ikkinchisini BAZA rad
   * etadi. O'sha holatda ham javob bir xil bo'lishi kerak.
   */
  private async explainShortfall(
    error: unknown,
    warehouseId: string,
    items: { variantId: string; sku: string; quantity: number }[],
  ): Promise<unknown> {
    const message = error instanceof Error ? error.message : '';

    if (!message.includes('BARFF_STOCK_RESERVED_EXCEEDS')) return error;

    const stock = await this.prisma.warehouseStock.findMany({
      where: { warehouseId, productVariantId: { in: items.map((item) => item.variantId) } },
      select: { productVariantId: true, quantity: true, reservedQuantity: true },
    });

    const shortfall: ShortfallLine[] = items
      .map((item) => {
        const row = stock.find((entry) => entry.productVariantId === item.variantId);
        const available = row === undefined ? 0 : row.quantity - row.reservedQuantity;

        return { sku: item.sku, required: item.quantity, available };
      })
      .filter((line) => line.available < line.required);

    return new ConflictException({
      message: "Omborda yetarli qoldiq yo'q",
      code: 'STOCK_SHORTFALL',
      details: shortfallDetails(shortfall),
    });
  }

  // ===========================================================================
  // BO'SHATISH VA BAJARISH
  // ===========================================================================

  /**
   * Buyurtma zaxirasini bo'shatadi (bekor qilish, muddat).
   *
   * `FULFILLED` zaxira boshqacha ko'riladi: tovar ALLAQACHON
   * ombordan chiqqan, ya'ni uni `RELEASED` bilan qaytarib
   * bo'lmaydi — `RETURN` yoziladi
   * (`docs/WAREHOUSE-POLICY.md` §4).
   */
  async releaseOrder(orderId: string, actor: Actor | null, ctx: RequestContext, reason?: string) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { orderId, status: { in: ['ACTIVE', 'FULFILLED'] } },
      select: {
        id: true,
        status: true,
        quantity: true,
        warehouseId: true,
        productVariantId: true,
        order: { select: { number: true } },
      },
    });

    if (reservations.length === 0) return { released: 0 };

    await this.prisma.$transaction(async (tx) => {
      for (const reservation of reservations) {
        await tx.stockMovement.create({
          data: {
            warehouseId: reservation.warehouseId,
            productVariantId: reservation.productVariantId,
            // Javonda edi -> bo'shaydi. Chiqib ketgan edi -> qaytadi.
            type: reservation.status === 'ACTIVE' ? 'RELEASED' : 'RETURN',
            quantity: reservation.quantity,
            reference: reservation.order.number,
            ...(reason !== undefined ? { reason } : {}),
            ...(actor !== null ? { actorId: actor.id } : {}),
          },
          select: { id: true },
        });

        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
      }
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STOCK_RELEASED,
      entity: 'order',
      entityId: orderId,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      after: { released: reservations.length, reason: reason ?? null },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return { released: reservations.length };
  }

  /**
   * Qadoqlash: tovar ombordan CHIQADI.
   *
   * TARTIB QAT'IY — avval `RELEASED`, keyin `OUT`.
   *
   * Teskari tartibda oraliq holat `reservedQuantity > quantity`
   * bo'lib qoladi va bazadagi tekshiruv BUTUN tranzaksiyani rad
   * etadi. Bu nazariya emas: qoida S30 da bazaga yozilgan va u
   * ishlaydi (test bilan qoplangan).
   */
  async fulfilOrder(orderId: string, actor: Actor | null, ctx: RequestContext) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { orderId, status: 'ACTIVE' },
      select: {
        id: true,
        quantity: true,
        warehouseId: true,
        productVariantId: true,
        order: { select: { number: true } },
      },
    });

    if (reservations.length === 0) {
      throw new ConflictException({
        message: "Buyurtmada faol zaxira yo'q — avval zaxiraga oling",
        code: 'RESERVATION_MISSING',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const reservation of reservations) {
        const common = {
          warehouseId: reservation.warehouseId,
          productVariantId: reservation.productVariantId,
          quantity: reservation.quantity,
          reference: reservation.order.number,
          ...(actor !== null ? { actorId: actor.id } : {}),
        };

        // 1. Band bo'shaydi.
        await tx.stockMovement.create({
          data: { ...common, type: 'RELEASED' },
          select: { id: true },
        });
        // 2. Qoldiq kamayadi.
        await tx.stockMovement.create({ data: { ...common, type: 'OUT' }, select: { id: true } });

        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: 'FULFILLED', fulfilledAt: new Date() },
        });
      }
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.STOCK_FULFILLED,
      entity: 'order',
      entityId: orderId,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      after: { fulfilled: reservations.length },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifyLowStock(
      reservations[0]?.warehouseId ?? '',
      reservations.map((reservation) => reservation.productVariantId),
    );

    return { fulfilled: reservations.length };
  }

  /**
   * Muddati o'tgan zaxiralarni bo'shatadi.
   *
   * REJALI ISH EMAS: buni xodim yoki tashqi `cron` chaqiradi
   * (`docs/WAREHOUSE-POLICY.md` §5). Rejalashtirgich S41 da.
   */
  async releaseExpired(actor: Actor, ctx: RequestContext) {
    const expired = await this.prisma.stockReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { not: null, lte: new Date() } },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    let released = 0;
    for (const row of expired) {
      const result = await this.releaseOrder(row.orderId, actor, ctx, 'Muddati o‘tdi');
      released += result.released;
    }

    return { orders: expired.length, released };
  }

  // ===========================================================================
  // YIG'ISH VARAQASI
  // ===========================================================================

  /**
   * Yig'ish varaqasi.
   *
   * SKU bo'yicha saralanadi — omborchi javonlar bo'ylab bir marta
   * yuradi. Mahsulot nomi bo'yicha saralash uni oldinga-orqaga
   * yurishga majbur qilardi.
   */
  async pickingList(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        number: true,
        status: true,
        shippingLabel: true,
        shippingRegion: true,
        createdAt: true,
        dealer: { select: { id: true, companyName: true } },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    const reservations = await this.prisma.stockReservation.findMany({
      where: { orderId, status: { in: ['ACTIVE', 'FULFILLED'] } },
      orderBy: { productVariant: { sku: 'asc' } },
      select: RESERVATION_SELECT,
    });

    return { order, lines: reservations };
  }

  /** Yig'ilishi kerak bo'lgan buyurtmalar. */
  async pickingQueue() {
    return this.prisma.order.findMany({
      where: { deletedAt: null, status: { in: ['RESERVED', 'PICKING', 'PACKED'] } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        number: true,
        status: true,
        createdAt: true,
        shippingRegion: true,
        dealer: { select: { id: true, companyName: true } },
        _count: { select: { items: true } },
      },
    });
  }

  listByOrder(orderId: string) {
    return this.prisma.stockReservation.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      select: { ...RESERVATION_SELECT, releasedAt: true, fulfilledAt: true, createdAt: true },
    });
  }

  // ===========================================================================
  // KAM QOLDIQ
  // ===========================================================================

  /**
   * Mavjud qoldiq chegaradan pastga tushsa xabar beradi.
   *
   * Chegara belgilanmagan qator KUZATILMAYDI — umumiy standart
   * chegara o'ylab topilgan raqam bo'lardi (1 litrli suv va 5
   * litrli balon uchun u bir xil bo'la olmaydi).
   */
  private async notifyLowStock(warehouseId: string, variantIds: string[]): Promise<void> {
    if (warehouseId === '' || variantIds.length === 0) return;

    const rows = await this.prisma.warehouseStock.findMany({
      where: {
        warehouseId,
        productVariantId: { in: variantIds },
        lowStockThreshold: { not: null },
      },
      select: {
        quantity: true,
        reservedQuantity: true,
        lowStockThreshold: true,
        warehouse: { select: { code: true, name: true } },
        productVariant: { select: { sku: true } },
      },
    });

    const low = rows.filter(
      (row) => row.quantity - row.reservedQuantity <= (row.lowStockThreshold ?? 0),
    );

    if (low.length === 0) return;

    /*
      Bildirishnoma HECH QACHON asosiy amalni yiqitmaydi —
      `notify()` o'zi yutadi (S22 da o'lchab topilgan nosozlik:
      bildirishnoma xatosi diler ro'yxatdan o'tishini `500` qilardi).
    */
    await this.notifications.notify({
      event: 'stock.low',
      subject: `Kam qoldiq: ${low.length} pozitsiya`,
      body: low
        .map(
          (row) =>
            `${row.productVariant.sku} (${row.warehouse.code}): ${row.quantity - row.reservedQuantity} dona, chegara ${row.lowStockThreshold}`,
        )
        .join('\n'),
      payload: { warehouseId, skus: low.map((row) => row.productVariant.sku) },
      ...(await this.lowStockTargets()),
    });
  }

  /** Kim xabardor bo'ladi — ombor ko'ra oladigan xodimlar. */
  private async lowStockTargets(): Promise<{ recipientIds?: string[] }> {
    const staff = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        roles: {
          some: { role: { permissions: { some: { permission: { code: 'warehouse.view' } } } } },
        },
      },
      select: { id: true },
    });

    return staff.length > 0 ? { recipientIds: staff.map((user) => user.id) } : {};
  }
}

/** `Prisma` tipini ishlatilgan holda qoldiradi (kelajakdagi filtrlar uchun). */
export type ReservationWhere = Prisma.StockReservationWhereInput;
