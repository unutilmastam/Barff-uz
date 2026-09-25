import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type OrderStatus } from '@barff/db';
import { canTransitionOrder } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { CartService } from '../cart/cart.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../warehouse/reservations.service';
import { OrderNumberService } from './order-number.service';

export interface SubmitOrderInput {
  addressId: string;
  note?: string | undefined;
  /** Takroriy yuborishga qarshi kalit (mijoz beradi). */
  idempotencyKey?: string | undefined;
}

interface Actor {
  id: string;
  email: string;
}

/** Dilerga qaytariladigan maydonlar. */
const ORDER_SELECT = {
  id: true,
  number: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  currency: true,
  promoCode: true,
  note: true,
  shippingLabel: true,
  shippingRegion: true,
  shippingAddress: true,
  contactName: true,
  contactPhone: true,
  shippingNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Buyurtmalar (CLAUDE.md §5, §28).
 *
 * UCHTA QAT'IY QOIDA:
 *
 * 1. NARX YUBORISH PAYTIDA MUZLATILADI. Savatda u har safar qayta
 *    hisoblanadi (S25), lekin buyurtmada — yo'q. Mijoz ko'rgan
 *    summa bilan hisob-faktura FARQ QILMASLIGI kerak.
 *
 * 2. HAR BIR O'TISH TARIXGA yoziladi. "Buyurtma qayerda?" degan
 *    savolga javob shu jadvalda.
 *
 * 3. TAKROR YUBORISH BITTA buyurtma yaratadi. Tugmani ikki marta
 *    bosish yoki tarmoq uzilishi ikkita buyurtma bermasligi kerak.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly numbers: OrderNumberService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly reservations: ReservationsService,
  ) {}

  // ===========================================================================
  // YUBORISH
  // ===========================================================================

  /**
   * Savatdan buyurtma yaratadi.
   *
   * BUTUN AMAL BITTA TRANZAKSIYADA: buyurtma yaratilib savat
   * bo'shatilmay qolsa, diler xuddi shu narsani qayta yuborardi.
   */
  async submit(dealerId: string, input: SubmitOrderInput, ctx: RequestContext) {
    /*
      TAKRORNI AVVAL tekshiramiz.

      Tranzaksiya ichidagi yagona indeks ham himoya qiladi, lekin u
      xato tashlaydi. Bu yerda esa mavjud buyurtma TINCH qaytariladi
      — mijoz uchun bu "yuborildi" bilan bir xil ko'rinadi.
    */
    if (input.idempotencyKey !== undefined) {
      const existing = await this.prisma.order.findFirst({
        where: { dealerId, idempotencyKey: input.idempotencyKey },
        select: ORDER_SELECT,
      });

      if (existing !== null) {
        this.logger.log(`Takroriy yuborish e'tiborsiz qoldirildi: ${existing.number}`);

        return { ...existing, duplicate: true };
      }
    }

    const cart = await this.cart.view(dealerId);

    if (cart.lines.length === 0) {
      throw new BadRequestException({ message: "Savat bo'sh", code: 'CART_EMPTY' });
    }

    /*
      ENG KAM BUYURTMA MIQDORI SHU YERDA MAJBURIY.

      Savatga qo'shishda u faqat BELGILANADI (S25): diler miqdorni
      bosqichma-bosqich oshiradi va har bosishda xato ko'rish uni
      chalg'itardi. Yuborishda esa qoida buziladigan joy qolmaydi.
    */
    const below = cart.lines.filter((line) => line.belowMinimum);

    if (below.length > 0) {
      throw new BadRequestException({
        message: `Eng kam buyurtma miqdori to'lmagan: ${below.map((line) => line.sku).join(', ')}`,
        code: 'ORDER_BELOW_MINIMUM',
      });
    }

    const address = await this.prisma.dealerAddress.findFirst({
      where: { id: input.addressId, dealerId, deletedAt: null },
    });

    if (address === null) {
      throw new NotFoundException({
        message: 'Manzil topilmadi',
        code: 'DEALER_ADDRESS_NOT_FOUND',
      });
    }

    const subtotal = cart.lines.reduce((sum, line) => sum + line.total, 0);
    const discount = cart.lines.reduce(
      (sum, line) => sum + (line.basePrice - line.unitPrice) * line.quantity,
      0,
    );

    /*
      POYGA HOLATI — va u O'LCHAB topildi.

      Yuqoridagi tekshiruv KETMA-KET yuborishni ushlaydi. BIR VAQTDA
      kelgan ikki so'rov esa ikkalasi ham "yo'q" deb ko'radi va
      ikkalasi ham yaratmoqchi bo'ladi. Bazadagi yagona indeks
      bittasini to'xtatadi — lekin u XATO tashlaydi.

      Birinchi versiyada bu xato yuqoriga chiqib `500` bo'lardi:
      buyurtma AYNI PAYTDA yaratilgan bo'lsa ham, diler "Internal
      Server Error" ko'rardi — va aynan shu uni QAYTA yuborishga
      undardi. Testda buni server logida ko'rdim.

      Endi P2002 ushlanadi va MAVJUD buyurtma qaytariladi: ikkala
      so'rov ham bir xil, to'g'ri javob oladi.
    */
    const order = await this.prisma
      .$transaction(async (tx) => {
        const number = await this.numbers.next(tx);

        const created = await tx.order.create({
          data: {
            number,
            dealerId,
            status: 'PENDING_REVIEW',
            addressId: address.id,
            // Manzil NUSXA sifatida: diler uni keyin o'chirsa ham
            // buyurtma qayerga ketgani yo'qolmaydi.
            shippingLabel: address.label,
            shippingRegion: address.region,
            shippingAddress: [address.district, address.city, address.street]
              .filter((part) => part !== null && part !== '')
              .join(', '),
            contactName: address.contactName,
            contactPhone: address.contactPhone,
            ...(address.notes !== null ? { shippingNotes: address.notes } : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            ...(cart.promoCode !== null ? { promoCode: cart.promoCode } : {}),
            ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
            subtotal,
            discount,
            total: subtotal,
            currency: cart.currency,
            items: {
              create: cart.lines.map((line) => ({
                variantId: line.variantId,
                sku: line.sku,
                productName: line.productName as Prisma.InputJsonValue,
                volumeMl: line.volumeMl,
                quantity: line.quantity,
                basePrice: line.basePrice,
                unitPrice: line.unitPrice,
                total: line.total,
                ...(line.discountRule !== null
                  ? { appliedRuleId: line.discountRule.id, appliedRuleName: line.discountRule.name }
                  : {}),
              })),
            },
            history: { create: { toStatus: 'PENDING_REVIEW' } },
          },
          select: ORDER_SELECT,
        });

        // Savat BO'SHATILADI — shu tranzaksiyada. Aks holda diler
        // xuddi shu narsani qayta yuborardi.
        await tx.cartItem.deleteMany({ where: { cart: { dealerId } } });
        await tx.cart.updateMany({ where: { dealerId }, data: { promoCode: null } });

        return created;
      })
      .catch(async (error: unknown) => {
        const key = input.idempotencyKey;

        const isDuplicate =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          key !== undefined;

        if (!isDuplicate || key === undefined) throw error;

        const existing = await this.prisma.order.findFirst({
          where: { dealerId, idempotencyKey: key },
          select: ORDER_SELECT,
        });

        /* c8 ignore next -- P2002 aynan shu indeksdan keladi */
        if (existing === null) throw error;

        this.logger.log(`Poyga: mavjud buyurtma qaytarildi ${existing.number}`);

        return { ...existing, alreadyExisted: true };
      });

    // Poygada yutqazgan so'rov uchun audit va bildirishnoma TAKRORAN
    // yozilmaydi — ular g'olib so'rovda allaqachon yozilgan.
    if ('alreadyExisted' in order) {
      const { alreadyExisted: _, ...row } = order;

      return { ...row, duplicate: true };
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.ORDER_CREATED,
      entity: 'order',
      entityId: order.id,
      after: { number: order.number, total: order.total },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifications.notify({
      event: 'order.created',
      subject: `Yangi buyurtma: ${order.number}`,
      body: [
        `Raqam: ${order.number}`,
        `Summa: ${order.total / 100} ${order.currency}`,
        `Manzil: ${order.shippingRegion}, ${order.shippingAddress}`,
      ].join('\n'),
      payload: { orderId: order.id, number: order.number },
      ...(await this.notificationTargets()),
    });

    return { ...order, duplicate: false };
  }

  /**
   * Buyurtmani ko'radigan xodimlar.
   *
   * `orders.view` — `orders.manage` EMAS. Yangi buyurtmadan sotuvchi
   * ham, ombor ham xabardor bo'lishi kerak; `orders.manage` faqat
   * adminda va u ikkalasini ham chetda qoldirardi.
   *
   * Ortiqcha xabardor qilish zararsiz (bildirishnoma ilova ichida),
   * kam xabardor qilish esa buyurtmaning e'tibordan chetda
   * qolishiga olib keladi.
   */
  private async notificationTargets(): Promise<{ recipientIds?: string[] }> {
    const staff = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        roles: {
          some: { role: { permissions: { some: { permission: { code: 'orders.view' } } } } },
        },
      },
      select: { id: true },
    });

    return staff.length > 0 ? { recipientIds: staff.map((user) => user.id) } : {};
  }

  // ===========================================================================
  // O'QISH
  // ===========================================================================

  async listForDealer(
    dealerId: string,
    query: { page: number; limit: number; status?: OrderStatus | undefined },
  ) {
    const request = toPageRequest(query);

    const where: Prisma.OrderWhereInput = {
      dealerId,
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: { ...ORDER_SELECT, _count: { select: { items: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  /**
   * Bitta buyurtma.
   *
   * `dealerId` MAJBURIY parametr: topilmagan va BOSHQA dilerniki —
   * bir xil javob (404). Ajratilsa, bu endpoint boshqa dilerlarning
   * buyurtma id larini tekshirish vositasiga aylanardi.
   */
  async findForDealer(dealerId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, dealerId, deletedAt: null },
      select: {
        ...ORDER_SELECT,
        items: { orderBy: { createdAt: 'asc' } },
        history: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
        },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    return order;
  }

  // ===========================================================================
  // HOLAT O'ZGARISHI
  // ===========================================================================

  /**
   * Holatni o'zgartiradi.
   *
   * O'TISH JADVALI `@barff/types` da va SERVER ham, panel ham
   * o'shani ishlatadi. Ruxsat etilmagan o'tish `409` beradi
   * (`ROADMAP.md` S26 DoD) — bu `400` emas, chunki so'rov TO'G'RI,
   * lekin resursning JORIY HOLATI unga yo'l qo'ymaydi.
   */
  async setStatus(
    id: string,
    to: OrderStatus,
    actor: Actor | null,
    ctx: RequestContext,
    note?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, number: true, status: true, dealerId: true },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    if (!canTransitionOrder(order.status, to)) {
      throw new ConflictException({
        message: `${order.status} dan ${to} ga o'tish mumkin emas`,
        code: 'ORDER_STATUS_INVALID_TRANSITION',
      });
    }

    /*
      OMBOR TA'SIRI HOLAT O'ZGARISHIDAN OLDIN (S31).

      Tartib ataylab shunday: zaxira olinmasa (qoldiq yetmasa),
      buyurtma `RESERVED` ga O'TMASLIGI kerak. Teskari tartibda
      buyurtma "zaxiraga olindi" deb ko'rinib, aslida hech narsa
      ushlab turilmagan bo'lardi — va buni faqat yig'ish paytida
      omborchi payqardi.

      Qoidalar `docs/WAREHOUSE-POLICY.md` da.
    */
    if (to === 'RESERVED') {
      await this.reservations.reserveOrder(id, actor, ctx);
    } else if (to === 'PACKED') {
      await this.reservations.fulfilOrder(id, actor, ctx);
    } else if (to === 'CANCELLED') {
      // Zaxira bo'lmasa jim o'tadi — bekor qilish har qanday
      // holatdan kelishi mumkin.
      await this.reservations.releaseOrder(id, actor, ctx, note ?? 'Buyurtma bekor qilindi');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id },
        data: { status: to },
        select: ORDER_SELECT,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: to,
          ...(note !== undefined ? { note } : {}),
          ...(actor !== null ? { actorId: actor.id } : {}),
        },
      });

      return row;
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
      entity: 'order',
      entityId: id,
      ...(actor !== null ? { actorId: actor.id, actorEmail: actor.email } : {}),
      before: { status: order.status },
      after: { status: to },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  /**
   * Diler O'Z buyurtmasini bekor qiladi.
   *
   * FAQAT ko'rib chiqilmagan buyurtma: tasdiqlangandan keyin ombor
   * ishga tushadi (S30) va bekor qilish xodim qarori bo'ladi.
   */
  async cancelByDealer(dealerId: string, id: string, actor: Actor, ctx: RequestContext) {
    const order = await this.prisma.order.findFirst({
      where: { id, dealerId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    if (order.status !== 'PENDING_REVIEW' && order.status !== 'DRAFT') {
      throw new ConflictException({
        message: "Ko'rib chiqilgan buyurtmani o'zingiz bekor qila olmaysiz",
        code: 'ORDER_CANCEL_NOT_ALLOWED',
      });
    }

    return this.setStatus(id, 'CANCELLED', actor, ctx, 'Diler bekor qildi');
  }
}
