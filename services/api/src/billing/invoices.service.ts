import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type InvoiceStatus, Prisma } from '@barff/db';
import {
  OPEN_INVOICE_STATUSES,
  canTransitionInvoice,
  invoiceOutstanding,
  invoiceStatusFor,
} from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { BillingNumberService } from './billing-number.service';

interface Actor {
  id: string;
  email: string;
}

/**
 * Hisob-faktura QAYSI buyurtmadan yaratiladi.
 *
 * `DELIVERED` — yagona holat. Sabab: hisob-faktura "tovar
 * yetkazildi, endi to'lang" degan hujjat. Yo'ldagi buyurtmaga
 * hisob-faktura berilsa va yetkazish BAJARILMASA, dilerda
 * to'lanishi kerak bo'lmagan hujjat qolardi va uni bekor qilish
 * alohida ish bo'lardi.
 *
 * Oldindan to'lov kerak bo'lsa, u TO'LOV sifatida kiritiladi va
 * balansda diler foydasiga turadi — hisob-fakturasiz
 * (`docs/BILLING-POLICY.md` §3).
 */
const INVOICEABLE_STATUSES = ['DELIVERED'] as const;

const INVOICE_SELECT = {
  id: true,
  number: true,
  status: true,
  subtotal: true,
  discount: true,
  taxAmount: true,
  total: true,
  currency: true,
  issuedAt: true,
  dueAt: true,
  cancelReason: true,
  internalNote: true,
  createdAt: true,
  dealer: { select: { id: true, companyName: true, region: true } },
  order: { select: { id: true, number: true, status: true, createdAt: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      sku: true,
      productName: true,
      volumeMl: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
  },
  allocations: {
    select: {
      id: true,
      amount: true,
      createdAt: true,
      payment: {
        select: { id: true, number: true, method: true, receivedAt: true, reference: true },
      },
    },
  },
} as const satisfies Prisma.InvoiceSelect;

/** Standart to'lov muddati — kun. Haqiqiy shart BARFF dan keladi (Q17). */
const DEFAULT_DUE_DAYS = 14;

/**
 * Hisob-fakturalar (CLAUDE.md §10, S36).
 *
 * Siyosat: `docs/BILLING-POLICY.md`. Qisqacha:
 * - hisob-faktura FAQAT yetkazilgan buyurtmadan;
 * - bitta buyurtmaga BITTA hisob-faktura;
 * - `ISSUED` dan keyin summalar MUZLAYDI;
 * - holat TAQSIMOTDAN kelib chiqadi, qo'lda qo'yilmaydi;
 * - soliq HOZIRCHA 0 (Q17).
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: BillingNumberService,
  ) {}

  /**
   * Buyurtmadan hisob-faktura yaratadi.
   *
   * Pozitsiyalar NUSXA olinadi, havola bilan bog'lanmaydi:
   * mahsulot keyin o'chirilsa yoki nomi o'zgarsa, berilgan hujjat
   * o'zgarmasligi kerak.
   */
  async createFromOrder(
    input: { orderId: string; dueAt?: Date | undefined; internalNote?: string | undefined },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, deletedAt: null },
      select: {
        id: true,
        number: true,
        status: true,
        dealerId: true,
        subtotal: true,
        discount: true,
        total: true,
        currency: true,
        invoice: { select: { id: true, number: true } },
        items: {
          select: {
            sku: true,
            productName: true,
            volumeMl: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    if (order.invoice !== null) {
      throw new ConflictException({
        message: `Bu buyurtmada hisob-faktura bor: ${order.invoice.number}`,
        code: 'INVOICE_EXISTS',
      });
    }

    if (!(INVOICEABLE_STATUSES as readonly string[]).includes(order.status)) {
      throw new ConflictException({
        message: 'Hisob-faktura faqat YETKAZILGAN buyurtmadan beriladi',
        code: 'ORDER_NOT_INVOICEABLE',
      });
    }

    if (order.items.length === 0) {
      throw new BadRequestException({
        message: "Buyurtmada pozitsiya yo'q",
        code: 'ORDER_EMPTY',
      });
    }

    const dueAt = input.dueAt ?? addDays(new Date(), DEFAULT_DUE_DAYS);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.nextInvoice(tx);

      return tx.invoice.create({
        data: {
          number,
          dealerId: order.dealerId,
          orderId: order.id,
          status: 'DRAFT',
          subtotal: order.subtotal,
          discount: order.discount,
          /*
            SOLIQ NOL VA U HISOBLANMAYDI.

            QQS stavkasi BARFF dan kelmagan (Q17). Stavkani
            o'ylab topish soliq hujjatini soxtalashtirish
            bo'lardi.
          */
          taxAmount: 0,
          total: order.total,
          currency: order.currency,
          ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
          dueAt,
          items: {
            create: order.items.map((item) => ({
              sku: item.sku,
              /*
                O'qishda `Json` `null` ham bo'la oladi, yozishda
                esa yo'q. Buyurtma yozuvi bilan bir xil yo'l
                (`orders.service.ts`): shakl o'sha yerda
                tekshirilgan va bu yerda faqat NUSXA olinadi.
              */
              productName: item.productName as Prisma.InputJsonValue,
              ...(item.volumeMl !== null ? { volumeMl: item.volumeMl } : {}),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        select: INVOICE_SELECT,
      });
    });

    await this.record(AUDIT_ACTIONS.INVOICE_CREATED, invoice.id, actor, ctx, {
      number: invoice.number,
      order: order.number,
      total: invoice.total,
    });

    return invoice;
  }

  async list(query: {
    page: number;
    limit: number;
    status?: InvoiceStatus | undefined;
    dealerId?: string | undefined;
    search?: string | undefined;
    openOnly?: boolean | undefined;
    overdueOnly?: boolean | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      /*
        "OCHIQ" — SERVERDA VA RO'YXAT SHARTI BILAN.

        Mijozda filtrlash sahifalashni buzardi: sahifadan
        yopilganlari olib tashlanib, "jami" eski qiymatda
        qolardi (S34 da o'lchangan).
      */
      ...(query.openOnly === true
        ? { status: { in: OPEN_INVOICE_STATUSES as unknown as InvoiceStatus[] } }
        : {}),
      /* Aniq holat `openOnly` dan USTUN — ikkalasi bitta ustunga tegadi. */
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.dealerId !== undefined ? { dealerId: query.dealerId } : {}),
      ...(query.overdueOnly === true
        ? {
            dueAt: { lt: new Date() },
            status: { in: OPEN_INVOICE_STATUSES as unknown as InvoiceStatus[] },
          }
        : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } },
              { dealer: { companyName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: INVOICE_SELECT,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(
      items.map((item) => this.withOutstanding(item)),
      total,
      request,
    );
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: INVOICE_SELECT,
    });

    if (invoice === null) {
      throw new NotFoundException({
        message: 'Hisob-faktura topilmadi',
        code: 'INVOICE_NOT_FOUND',
      });
    }

    return this.withOutstanding(invoice);
  }

  /**
   * Diler uchun BITTA hisob-faktura.
   *
   * Begona hisob-faktura `404` beradi, `403` EMAS: `403` "bunday
   * hujjat BOR, lekin sizga emas" degani va shu bilan boshqa
   * dilerlarning id larini sinab ko'rish mumkin bo'lardi
   * (`docs/DELIVERY-POLICY.md` §4 dagi bilan bir xil sabab).
   *
   * QORALAMA ham ko'rsatilmaydi: u hali BERILMAGAN hujjat.
   */
  async findForDealer(dealerId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, dealerId, deletedAt: null, status: { not: 'DRAFT' } },
      select: INVOICE_SELECT,
    });

    if (invoice === null) {
      throw new NotFoundException({
        message: 'Hisob-faktura topilmadi',
        code: 'INVOICE_NOT_FOUND',
      });
    }

    return this.withOutstanding(invoice);
  }

  async listForDealer(
    dealerId: string,
    query: {
      page: number;
      limit: number;
      status?: InvoiceStatus | undefined;
      openOnly?: boolean | undefined;
    },
  ) {
    const request = toPageRequest(query);

    const where: Prisma.InvoiceWhereInput = {
      dealerId,
      deletedAt: null,
      // Qoralama DILERGA KO'RSATILMAYDI — u hali berilmagan.
      status: { not: 'DRAFT' },
      ...(query.openOnly === true
        ? { status: { in: OPEN_INVOICE_STATUSES as unknown as InvoiceStatus[] } }
        : {}),
      ...(query.status !== undefined && query.status !== 'DRAFT' ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: INVOICE_SELECT,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(
      items.map((item) => this.withOutstanding(item)),
      total,
      request,
    );
  }

  /** Qoralamani BERADI — shundan keyin summalar muzlaydi. */
  async issue(id: string, actor: Actor, ctx: RequestContext) {
    const invoice = await this.findOne(id);

    if (!canTransitionInvoice(invoice.status, 'ISSUED')) {
      throw new ConflictException({
        message: `${invoice.status} dan BERILGAN ga o‘tib bo‘lmaydi`,
        code: 'INVOICE_TRANSITION_FORBIDDEN',
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'ISSUED', issuedAt: new Date() },
      select: INVOICE_SELECT,
    });

    await this.record(AUDIT_ACTIONS.INVOICE_ISSUED, id, actor, ctx, {
      number: updated.number,
      total: updated.total,
    });

    return this.withOutstanding(updated);
  }

  /**
   * Bekor qiladi.
   *
   * TAQSIMLANGAN TO'LOVI BOR HUJJAT BEKOR QILINMAYDI. Aks holda
   * pul "hech qaysi hisob-fakturaga tegishli emas" holatga
   * tushib qolardi va balans tushunarsiz bo'lardi: avval
   * taqsimot olib tashlanadi, keyin bekor qilinadi.
   */
  async cancel(id: string, reason: string, actor: Actor, ctx: RequestContext) {
    const invoice = await this.findOne(id);

    if (!canTransitionInvoice(invoice.status, 'CANCELLED')) {
      throw new ConflictException({
        message: `${invoice.status} holatidagi hisob-fakturani bekor qilib bo‘lmaydi`,
        code: 'INVOICE_TRANSITION_FORBIDDEN',
      });
    }

    if (invoice.allocations.length > 0) {
      throw new ConflictException({
        message: 'Taqsimlangan to‘lovi bor — avval taqsimotni olib tashlang',
        code: 'INVOICE_HAS_ALLOCATIONS',
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason },
      select: INVOICE_SELECT,
    });

    await this.record(AUDIT_ACTIONS.INVOICE_CANCELLED, id, actor, ctx, {
      number: updated.number,
      reason,
    });

    return this.withOutstanding(updated);
  }

  /** Muddat va ichki izoh — summalarga TEGMAYDI. */
  async update(
    id: string,
    input: { dueAt?: Date | null | undefined; internalNote?: string | undefined },
    actor: Actor,
    ctx: RequestContext,
  ) {
    await this.findOne(id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
      },
      select: INVOICE_SELECT,
    });

    await this.record(AUDIT_ACTIONS.INVOICE_CHANGED, id, actor, ctx, {
      number: updated.number,
      dueAt: updated.dueAt,
    });

    return this.withOutstanding(updated);
  }

  /**
   * Holatni TAQSIMOTGA qarab qayta hisoblaydi.
   *
   * Bu YAGONA joy: holat hech qayerda qo'lda qo'yilmaydi.
   * `CANCELLED` va `DRAFT` ga tegilmaydi — ular to'lovga bog'liq
   * emas.
   */
  async refreshStatus(tx: Prisma.TransactionClient, invoiceId: string): Promise<void> {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, total: true },
    });

    if (invoice === null || invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') return;

    const sum = await tx.paymentAllocation.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const next = invoiceStatusFor(invoice.total, sum._sum.amount ?? 0);

    if (next !== invoice.status) {
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: next } });
    }
  }

  /** Qolgan qarz — SAQLANMAYDI, har o'qishda hisoblanadi. */
  private withOutstanding<T extends { total: number; allocations: { amount: number }[] }>(
    invoice: T,
  ): T & { allocated: number; outstanding: number } {
    const allocated = invoice.allocations.reduce((sum, row) => sum + row.amount, 0);

    return { ...invoice, allocated, outstanding: invoiceOutstanding(invoice.total, allocated) };
  }

  private async record(
    action: string,
    entityId: string,
    actor: Actor,
    ctx: RequestContext,
    after: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record({
      action,
      entity: 'invoice',
      entityId,
      actorId: actor.id,
      actorEmail: actor.email,
      after,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });
  }
}

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);

  return next;
}
