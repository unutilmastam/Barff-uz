import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type DeliveryStatus, type OrderStatus, type Prisma } from '@barff/db';
import { canTransitionDelivery, canTransitionOrder } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryNumberService } from './delivery-number.service';

interface Actor {
  id: string;
  email: string;
}

/**
 * Yetkazma holati BUYURTMANING qaysi holatiga mos keladi.
 *
 * Jadval `docs/DELIVERY-POLICY.md` §2 dan KO'CHIRILGAN va ikkalasi
 * bir xil bo'lishi shart.
 *
 * `null` — buyurtma TEGILMAYDI. `FAILED` va `CANCELLED` uchun
 * aynan shunday: yetkazilmagan buyurtma bilan nima qilish ODAM
 * qarori (qayta urinish, bekor qilish, manzilni o'zgartirish) va
 * tizim ularning birortasini o'zi tanlay olmaydi.
 */
const ORDER_STATUS_FOR: Record<DeliveryStatus, OrderStatus | null> = {
  CREATED: 'READY_FOR_DELIVERY',
  ASSIGNED: 'DRIVER_ASSIGNED',
  // Buyurtmada `PICKED_UP` va `ARRIVED` YO'Q — dilerga "yo'lda" yetarli.
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: null,
  CANCELLED: null,
};

/**
 * HAYDOVCHI QILA OLADIGAN o'tishlar (`docs/DELIVERY-POLICY.md` §5).
 *
 * Biriktirish va bekor qilish — LOGIST qarori. Haydovchi o'ziga ish
 * biriktira olmaydi va ishni bekor qila olmaydi.
 */
const DRIVER_ALLOWED: readonly DeliveryStatus[] = [
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
];

const DELIVERY_SELECT = {
  id: true,
  number: true,
  status: true,
  shippingLabel: true,
  shippingRegion: true,
  shippingAddress: true,
  contactName: true,
  contactPhone: true,
  shippingNotes: true,
  scheduledFor: true,
  assignedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  failureReason: true,
  receivedBy: true,
  proofNote: true,
  createdAt: true,
  order: {
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      currency: true,
      dealer: { select: { id: true, companyName: true } },
      _count: { select: { items: true } },
    },
  },
  driver: {
    select: { id: true, user: { select: { id: true, fullName: true, phone: true } } },
  },
  vehicle: { select: { id: true, plateNumber: true, model: true } },
  route: { select: { id: true, code: true, name: true } },
} as const;

/**
 * Yetkazib berish (CLAUDE.md §6, S32).
 *
 * SIYOSAT `docs/DELIVERY-POLICY.md` DA. Qisqacha:
 * - yetkazma buyurtmani YETAKLAYDI, aksincha emas;
 * - `FAILED`/`CANCELLED` buyurtmaga TEGMAYDI;
 * - haydovchi faqat O'Z yetkazmasiga tegadi va uni `404` ko'radi;
 * - jonli GPS YO'Q.
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DeliveryNumberService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ===========================================================================
  // YARATISH
  // ===========================================================================

  /**
   * Buyurtma uchun yetkazma yaratadi.
   *
   * `PACKED -> READY_FOR_DELIVERY` o'tishining YONDOSH TA'SIRI
   * (`docs/DELIVERY-POLICY.md` §7). Qo'lda yaratish endpointi yo'q:
   * yetkazmasiz `READY_FOR_DELIVERY` buyurtma — hech kim
   * ko'rmaydigan buyurtma.
   */
  async createForOrder(orderId: string, actor: Actor | null, ctx: RequestContext) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        number: true,
        shippingLabel: true,
        shippingRegion: true,
        shippingAddress: true,
        contactName: true,
        contactPhone: true,
        shippingNotes: true,
        delivery: { select: { id: true } },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    // Takroriy chaqiruv JIM o'tadi: `READY_FOR_DELIVERY` ga qayta
    // o'tish bo'lmasa ham, bu yerda yiqilish kerak emas.
    if (order.delivery !== null) return this.findOne(order.delivery.id);

    const delivery = await this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.next(tx);

      const row = await tx.delivery.create({
        data: {
          number,
          orderId: order.id,
          status: 'CREATED',
          shippingLabel: order.shippingLabel,
          shippingRegion: order.shippingRegion,
          shippingAddress: order.shippingAddress,
          contactName: order.contactName,
          contactPhone: order.contactPhone,
          ...(order.shippingNotes !== null ? { shippingNotes: order.shippingNotes } : {}),
        },
        select: DELIVERY_SELECT,
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: row.id,
          toStatus: 'CREATED',
          note: `Buyurtma ${order.number}`,
          ...(actor !== null ? { actorId: actor.id } : {}),
        },
      });

      return row;
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DELIVERY_CREATED,
      entity: 'delivery',
      entityId: delivery.id,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      after: { number: delivery.number, orderNumber: order.number },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return delivery;
  }

  // ===========================================================================
  // O'QISH
  // ===========================================================================

  async list(query: {
    page: number;
    limit: number;
    status?: DeliveryStatus | undefined;
    driverId?: string | undefined;
    region?: string | undefined;
    search?: string | undefined;
    unassigned?: boolean | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.DeliveryWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.driverId !== undefined ? { driverId: query.driverId } : {}),
      ...(query.unassigned === true ? { driverId: null } : {}),
      ...(query.region !== undefined && query.region.length > 0
        ? { shippingRegion: { contains: query.region, mode: 'insensitive' } }
        : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: DELIVERY_SELECT,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...DELIVERY_SELECT,
        internalNote: true,
        events: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            actor: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (delivery === null) {
      throw new NotFoundException({ message: 'Yetkazma topilmadi', code: 'DELIVERY_NOT_FOUND' });
    }

    return delivery;
  }

  /**
   * Haydovchining O'Z yetkazmalari.
   *
   * `driverId` SO'ROVDAN OLINMAYDI — u foydalanuvchi id sidan
   * topiladi. Aks holda haydovchi boshqa haydovchining id sini
   * yozib, uning ishini ko'ra olardi (IDOR).
   */
  async myAssignments(userId: string, onlyOpen = true) {
    const driver = await this.requireDriver(userId);

    return this.prisma.delivery.findMany({
      where: {
        driverId: driver.id,
        deletedAt: null,
        ...(onlyOpen ? { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } } : {}),
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      select: DELIVERY_SELECT,
    });
  }

  /**
   * Haydovchi uchun BITTA yetkazma.
   *
   * Boshqa haydovchining yetkazmasi `404` beradi — `403` EMAS
   * (`docs/DELIVERY-POLICY.md` §4). `403` "bunday yetkazma BOR,
   * lekin sizga emas" degani va shu bilan id larni sinab ko'rish
   * mumkin bo'lardi.
   */
  async findOneForDriver(userId: string, id: string) {
    const driver = await this.requireDriver(userId);

    const delivery = await this.prisma.delivery.findFirst({
      where: { id, driverId: driver.id, deletedAt: null },
      select: {
        ...DELIVERY_SELECT,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
        },
      },
    });

    if (delivery === null) {
      throw new NotFoundException({ message: 'Yetkazma topilmadi', code: 'DELIVERY_NOT_FOUND' });
    }

    return delivery;
  }

  private async requireDriver(userId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (driver === null) {
      throw new ForbiddenException({
        message: "Sizda haydovchi profili yo'q yoki u faol emas",
        code: 'DRIVER_NOT_ACTIVE',
      });
    }

    return driver;
  }

  // ===========================================================================
  // BIRIKTIRISH
  // ===========================================================================

  /** Haydovchi va mashina biriktirish — LOGIST qarori. */
  async assign(
    id: string,
    input: { driverId: string; vehicleId?: string | undefined; scheduledFor?: Date | undefined },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, number: true, driverId: true },
    });

    if (delivery === null) {
      throw new NotFoundException({ message: 'Yetkazma topilmadi', code: 'DELIVERY_NOT_FOUND' });
    }

    const driver = await this.prisma.driver.findFirst({
      where: { id: input.driverId, deletedAt: null, isActive: true },
      select: { id: true, vehicleId: true, user: { select: { id: true, fullName: true } } },
    });

    if (driver === null) {
      throw new BadRequestException({
        message: 'Haydovchi topilmadi yoki faol emas',
        code: 'DRIVER_NOT_FOUND',
      });
    }

    /*
      Mashina berilmasa haydovchining ODATDAGI mashinasi olinadi,
      lekin u yetkazmaga ALOHIDA yoziladi: haydovchi ertaga boshqa
      mashinada yursa, KECHAGI yetkazma qaysi mashinada ketganini
      bilish kerak bo'ladi.
    */
    const vehicleId = input.vehicleId ?? driver.vehicleId ?? null;

    if (vehicleId !== null) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, deletedAt: null, isActive: true },
        select: { id: true },
      });

      if (vehicle === null) {
        throw new BadRequestException({
          message: 'Mashina topilmadi yoki faol emas',
          code: 'VEHICLE_NOT_FOUND',
        });
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        driverId: driver.id,
        ...(vehicleId !== null ? { vehicleId } : {}),
        ...(input.scheduledFor !== undefined ? { scheduledFor: input.scheduledFor } : {}),
      },
      select: DELIVERY_SELECT,
    });

    /*
      BIRIKTIRISH O'ZI HOLAT EMAS.

      `CREATED -> ASSIGNED` o'tishi alohida bajariladi, chunki
      qayta biriktirish (haydovchi kasal bo'lib qoldi) holatni
      o'zgartirmaydi — u allaqachon `ASSIGNED`.
    */
    if (delivery.status === 'CREATED') {
      return this.setStatus(id, 'ASSIGNED', actor, ctx, {
        note: `Haydovchi: ${driver.user.fullName}`,
      });
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.DELIVERY_ASSIGNED,
      entity: 'delivery',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { driverId: delivery.driverId },
      after: { driverId: driver.id, vehicleId },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifyDriver(driver.user.id, updated.number, updated.shippingRegion);

    return updated;
  }

  // ===========================================================================
  // HOLAT
  // ===========================================================================

  /**
   * Yetkazma holatini o'zgartiradi va BUYURTMANI unga moslaydi.
   *
   * Moslik bir tomonlama (`docs/DELIVERY-POLICY.md` §1): yetkazma
   * buyurtmani yetaklaydi. Ikki tomonlama moslashtirish halqa
   * hosil qilardi.
   */
  async setStatus(
    id: string,
    to: DeliveryStatus,
    actor: Actor | null,
    ctx: RequestContext,
    options: {
      note?: string | undefined;
      failureReason?: string | undefined;
      receivedBy?: string | undefined;
      proofNote?: string | undefined;
      /** Haydovchi chaqirayotgan bo'lsa — ruxsat toraytiriladi. */
      asDriver?: string | undefined;
    } = {},
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        deletedAt: null,
        // Haydovchi uchun `404`: boshqa yetkazma UMUMAN ko'rinmaydi.
        ...(options.asDriver !== undefined ? { driver: { userId: options.asDriver } } : {}),
      },
      select: { id: true, number: true, status: true, orderId: true, driverId: true },
    });

    if (delivery === null) {
      throw new NotFoundException({ message: 'Yetkazma topilmadi', code: 'DELIVERY_NOT_FOUND' });
    }

    if (options.asDriver !== undefined && !DRIVER_ALLOWED.includes(to)) {
      throw new ForbiddenException({
        message: 'Bu amal logist vakolatida',
        code: 'DELIVERY_DRIVER_FORBIDDEN',
      });
    }

    if (!canTransitionDelivery(delivery.status, to)) {
      throw new ConflictException({
        message: `${delivery.status} dan ${to} ga o'tish mumkin emas`,
        code: 'DELIVERY_INVALID_TRANSITION',
      });
    }

    if (to === 'FAILED' && (options.failureReason ?? '').trim() === '') {
      throw new BadRequestException({
        message: 'Yetkazilmagani uchun sabab kiritilishi shart',
        code: 'DELIVERY_REASON_REQUIRED',
      });
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.delivery.update({
        where: { id },
        data: {
          status: to,
          ...(to === 'ASSIGNED' ? { assignedAt: now } : {}),
          ...(to === 'PICKED_UP' ? { pickedUpAt: now } : {}),
          ...(to === 'DELIVERED' ? { deliveredAt: now } : {}),
          ...(options.failureReason !== undefined ? { failureReason: options.failureReason } : {}),
          ...(options.receivedBy !== undefined ? { receivedBy: options.receivedBy } : {}),
          ...(options.proofNote !== undefined ? { proofNote: options.proofNote } : {}),
        },
        select: DELIVERY_SELECT,
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: id,
          fromStatus: delivery.status,
          toStatus: to,
          ...(options.note !== undefined
            ? { note: options.note }
            : options.failureReason !== undefined
              ? { note: options.failureReason }
              : {}),
          ...(actor !== null ? { actorId: actor.id } : {}),
        },
      });

      await this.syncOrder(tx, delivery.orderId, to, actor);

      return row;
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DELIVERY_STATUS_CHANGED,
      entity: 'delivery',
      entityId: id,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      before: { status: delivery.status },
      after: { status: to, failureReason: options.failureReason ?? null },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  /**
   * Buyurtmani yetkazma holatiga moslaydi.
   *
   * IKKI HOLATDA HECH NARSA QILINMAYDI:
   *
   * 1. Jadvalda `null` bo'lsa (`FAILED`, `CANCELLED`) — buyurtma
   *    bilan nima qilish ODAM qarori.
   * 2. Buyurtma ALLAQACHON o'sha holatda bo'lsa. Uchta yetkazma
   *    holati (`PICKED_UP`, `IN_TRANSIT`, `ARRIVED`) buyurtmaning
   *    bitta holatiga tushadi, ya'ni ikkinchi va uchinchisi
   *    o'zini-o'ziga o'tish bo'lardi — buyurtma mashinasi esa uni
   *    rad etadi (S26) va haydovchi "yetib keldim" tugmasini bosa
   *    olmasdi.
   */
  private async syncOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    deliveryStatus: DeliveryStatus,
    actor: Actor | null,
  ): Promise<void> {
    const target = ORDER_STATUS_FOR[deliveryStatus];
    if (target === null) return;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (order === null || order.status === target) return;

    if (!canTransitionOrder(order.status, target)) {
      /*
        MOSLASHTIRISH YETKAZMANI YIQITMAYDI.

        Buyurtma qo'lda boshqa holatga o'tkazilgan bo'lishi mumkin
        (masalan bekor qilingan). O'shanda yetkazma yangilanishini
        rad etish haydovchini ishlay olmaydigan holatda qoldirardi.
        Nomuvofiqlik JURNALGA yoziladi va logist ko'radi.
      */
      this.logger.warn(
        `Buyurtma ${order.id}: ${order.status} dan ${target} ga o'tib bo'lmadi (yetkazma ${deliveryStatus})`,
      );
      return;
    }

    await tx.order.update({ where: { id: orderId }, data: { status: target } });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: target,
        note: `Yetkazma holati: ${deliveryStatus}`,
        ...(actor !== null ? { actorId: actor.id } : {}),
      },
    });
  }

  /** Ichki izoh — DILERGA ko'rsatilmaydi. */
  async setInternalNote(id: string, note: string, actor: Actor, ctx: RequestContext) {
    await this.findOne(id);

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { internalNote: note },
      select: { id: true, internalNote: true },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DELIVERY_NOTE_CHANGED,
      entity: 'delivery',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  private async notifyDriver(userId: string, number: string, region: string): Promise<void> {
    await this.notifications.notify({
      event: 'delivery.assigned',
      subject: `Yangi yetkazma: ${number}`,
      body: `Hudud: ${region}`,
      payload: { number },
      recipientIds: [userId],
    });
  }
}
