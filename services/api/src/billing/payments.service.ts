import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type PaymentMethod, Prisma } from '@barff/db';
import { OPEN_INVOICE_STATUSES, dealerBalance } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { BillingNumberService } from './billing-number.service';
import { InvoicesService } from './invoices.service';

interface Actor {
  id: string;
  email: string;
}

interface AllocationInput {
  invoiceId: string;
  amount: number;
}

const PAYMENT_SELECT = {
  id: true,
  number: true,
  amount: true,
  currency: true,
  method: true,
  reference: true,
  receivedAt: true,
  note: true,
  createdAt: true,
  dealer: { select: { id: true, companyName: true } },
  recordedBy: { select: { id: true, fullName: true } },
  allocations: {
    select: {
      id: true,
      amount: true,
      invoice: { select: { id: true, number: true, total: true, status: true } },
    },
  },
} as const satisfies Prisma.PaymentSelect;

/**
 * To'lovlar va balans (CLAUDE.md §10, S36).
 *
 * BALANS SAQLANMAYDI. U har o'qishda hisoblanadi:
 *
 *     qarz = berilgan hisob-fakturalar - kelgan to'lovlar
 *
 * Saqlangan balans jurnaldan ajralib ketishi mumkin va ajralganda
 * qaysi biri to'g'ri ekani KO'RINMAYDI. Omborda ham shu sabab
 * qoldiq harakat jurnalining proyeksiyasi qilingan (S30), lekin
 * u yerda tetik bor; bu yerda esa saqlashning o'zi kerak emas,
 * chunki jadvalar kichik va so'rov arzon.
 *
 * Siyosat: `docs/BILLING-POLICY.md`.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: BillingNumberService,
    private readonly invoices: InvoicesService,
  ) {}

  /**
   * To'lovni yozadi va taqsimlaydi.
   *
   * `allocations` berilmasa — ESKISIDAN BOSHLAB avtomatik
   * taqsimlanadi. Bu eng ko'p uchraydigan holat ("diler qarzini
   * yopdi") va uni qo'lda qildirish xatoga yo'l ochardi.
   *
   * Taqsimot TRANZAKSIYADA: to'lov yozilib, taqsimot yozilmay
   * qolsa, balans to'g'ri ko'rinardi, lekin hisob-fakturalar
   * ochiq qolardi.
   */
  async record(
    input: {
      dealerId: string;
      amount: number;
      method: PaymentMethod;
      receivedAt: Date;
      reference?: string | undefined;
      note?: string | undefined;
      allocations?: AllocationInput[] | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { id: input.dealerId, deletedAt: null },
      select: { id: true, companyName: true },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    const planned =
      input.allocations !== undefined && input.allocations.length > 0
        ? await this.validateAllocations(input.dealerId, input.amount, input.allocations)
        : await this.autoAllocate(input.dealerId, input.amount);

    const payment = await this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.nextPayment(tx, input.receivedAt);

      const created = await tx.payment.create({
        data: {
          number,
          dealerId: input.dealerId,
          amount: input.amount,
          method: input.method,
          receivedAt: input.receivedAt,
          recordedById: actor.id,
          ...(input.reference !== undefined ? { reference: input.reference } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(planned.length > 0
            ? {
                allocations: {
                  create: planned.map((row) => ({ invoiceId: row.invoiceId, amount: row.amount })),
                },
              }
            : {}),
        },
        select: { id: true, number: true },
      });

      for (const row of planned) {
        await this.invoices.refreshStatus(tx, row.invoiceId);
      }

      return created;
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PAYMENT_RECORDED,
      entity: 'payment',
      entityId: payment.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: {
        number: payment.number,
        dealer: dealer.companyName,
        amount: input.amount,
        method: input.method,
        allocated: planned.reduce((sum, row) => sum + row.amount, 0),
      },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return this.findOne(payment.id);
  }

  /**
   * Mavjud to'lovni QAYTA taqsimlaydi.
   *
   * Eski taqsimot butunlay o'chiriladi va yangisi yoziladi —
   * "qo'shish" emas, "almashtirish". Qo'shish bo'lsa, ikki marta
   * yuborilgan so'rov summani ikki barobar qilardi.
   */
  async allocate(id: string, allocations: AllocationInput[], actor: Actor, ctx: RequestContext) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, number: true, dealerId: true, amount: true },
    });

    if (payment === null) {
      throw new NotFoundException({ message: 'To‘lov topilmadi', code: 'PAYMENT_NOT_FOUND' });
    }

    const planned = await this.validateAllocations(payment.dealerId, payment.amount, allocations);

    await this.prisma.$transaction(async (tx) => {
      const previous = await tx.paymentAllocation.findMany({
        where: { paymentId: id },
        select: { invoiceId: true },
      });

      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });

      if (planned.length > 0) {
        await tx.paymentAllocation.createMany({
          data: planned.map((row) => ({
            paymentId: id,
            invoiceId: row.invoiceId,
            amount: row.amount,
          })),
        });
      }

      /*
        ESKI hisob-fakturalar ham yangilanadi.

        Taqsimot olib tashlangan hujjat "to'landi" bo'lib qolsa,
        balans to'g'ri, ro'yxat esa yolg'on ko'rsatardi.
      */
      const touched = new Set([
        ...previous.map((row) => row.invoiceId),
        ...planned.map((row) => row.invoiceId),
      ]);

      for (const invoiceId of touched) {
        await this.invoices.refreshStatus(tx, invoiceId);
      }
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.PAYMENT_ALLOCATED,
      entity: 'payment',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { number: payment.number, allocations: planned.length },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return this.findOne(id);
  }

  async list(query: {
    page: number;
    limit: number;
    dealerId?: string | undefined;
    method?: PaymentMethod | undefined;
    search?: string | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.dealerId !== undefined ? { dealerId: query.dealerId } : {}),
      ...(query.method !== undefined ? { method: query.method } : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { dealer: { companyName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
        skip: request.skip,
        take: request.take,
        select: PAYMENT_SELECT,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(
      items.map((item) => this.withUnallocated(item)),
      total,
      request,
    );
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      select: PAYMENT_SELECT,
    });

    if (payment === null) {
      throw new NotFoundException({ message: 'To‘lov topilmadi', code: 'PAYMENT_NOT_FOUND' });
    }

    return this.withUnallocated(payment);
  }

  async listForDealer(dealerId: string, query: { page: number; limit: number }) {
    const request = toPageRequest(query);
    const where: Prisma.PaymentWhereInput = { dealerId, deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }],
        skip: request.skip,
        take: request.take,
        select: {
          id: true,
          number: true,
          amount: true,
          currency: true,
          method: true,
          reference: true,
          receivedAt: true,
          allocations: { select: { amount: true, invoice: { select: { number: true } } } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  /**
   * Diler balansi — HISOBLANADI, saqlanmaydi (S36 DoD).
   *
   * Bekor qilingan va qoralama hisob-fakturalar KIRMAYDI: birinchisi
   * yo'q qilingan majburiyat, ikkinchisi hali berilmagan.
   */
  async balance(dealerId: string) {
    /*
      BERILGAN HAMMA HUJJAT QO'SHILADI, faqat ochiqlari emas.

      Avval bu yerda faqat `ISSUED`/`PARTIALLY_PAID` qo'shilardi,
      `paid` esa HAMMA to'lovni. To'liq to'langan hisob-faktura
      `PAID` bo'lib chiqib ketardi, uning to'lovi esa qolardi —
      ya'ni qarz MANFIY ko'rinardi va diler "oldindan to'lagan"
      bo'lib chiqardi.

      Bekor qilingan (`CANCELLED`) va qoralama (`DRAFT`)
      qo'shilmaydi: birinchisi yo'q qilingan majburiyat,
      ikkinchisi hali berilmagan hujjat.
    */
    const [invoiced, paid, allocated, dealer] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          dealerId,
          deletedAt: null,
          status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] },
        },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: { dealerId, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.paymentAllocation.aggregate({
        where: { payment: { dealerId, deletedAt: null } },
        _sum: { amount: true },
      }),
      this.prisma.dealer.findUnique({
        where: { id: dealerId },
        select: { id: true, companyName: true, creditLimit: true },
      }),
    ]);

    return {
      dealer,
      ...dealerBalance(invoiced._sum.total ?? 0, paid._sum.amount ?? 0, allocated._sum.amount ?? 0),
    };
  }

  /**
   * Kredit limitini qo'yadi yoki olib tashlaydi.
   *
   * `null` — LIMIT SOZLANMAGAN, ya'ni tekshirilmaydi
   * (`docs/BILLING-POLICY.md` §4). Bu "kredit yo'q" degani EMAS:
   * shunday o'qilsa, bugungi hamma diler (hammasida `null`)
   * buyurtma bera olmay qolardi.
   */
  async setCreditLimit(
    dealerId: string,
    creditLimit: number | null,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null },
      select: { id: true, companyName: true, creditLimit: true },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    const updated = await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { creditLimit },
      select: { id: true, companyName: true, creditLimit: true },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CREDIT_LIMIT_CHANGED,
      entity: 'dealer',
      entityId: dealerId,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { creditLimit: dealer.creditLimit },
      after: { creditLimit: updated.creditLimit },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  /**
   * Qo'lda berilgan taqsimotni tekshiradi.
   *
   * UCHTA SHART: hisob-faktura shu dilerniki, ochiq, va
   * taqsimlangan summa to'lov summasidan oshmaydi. Uchtasi ham
   * buzilsa balans tushunarsiz bo'lardi.
   */
  private async validateAllocations(
    dealerId: string,
    paymentAmount: number,
    allocations: AllocationInput[],
  ): Promise<AllocationInput[]> {
    const ids = allocations.map((row) => row.invoiceId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        message: 'Bitta hisob-faktura ikki marta ko‘rsatilgan',
        code: 'ALLOCATION_DUPLICATE',
      });
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: ids }, dealerId, deletedAt: null },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        allocations: { select: { amount: true, paymentId: true } },
      },
    });

    if (invoices.length !== ids.length) {
      throw new BadRequestException({
        message: 'Ba’zi hisob-fakturalar bu dilerga tegishli emas yoki topilmadi',
        code: 'INVOICE_NOT_FOUND',
      });
    }

    const closed = invoices.filter(
      (invoice) => invoice.status === 'CANCELLED' || invoice.status === 'DRAFT',
    );

    if (closed.length > 0) {
      throw new BadRequestException({
        message: `Bekor qilingan yoki berilmagan hisob-fakturaga to‘lov taqsimlanmaydi: ${closed
          .map((invoice) => invoice.number)
          .join(', ')}`,
        code: 'INVOICE_NOT_OPEN',
      });
    }

    const total = allocations.reduce((sum, row) => sum + row.amount, 0);

    if (total > paymentAmount) {
      throw new BadRequestException({
        message: 'Taqsimlangan summa to‘lov summasidan katta',
        code: 'ALLOCATION_EXCEEDS_PAYMENT',
      });
    }

    return allocations;
  }

  /**
   * Avtomatik taqsimot — ESKISIDAN BOSHLAB.
   *
   * Eng eski qarz birinchi yopiladi: buxgalteriyada odatiy tartib
   * va u muddati o'tgan hujjatni birinchi yopadi.
   */
  private async autoAllocate(dealerId: string, amount: number): Promise<AllocationInput[]> {
    const open = await this.prisma.invoice.findMany({
      where: {
        dealerId,
        deletedAt: null,
        status: { in: OPEN_INVOICE_STATUSES as unknown as ('ISSUED' | 'PARTIALLY_PAID')[] },
      },
      orderBy: [{ issuedAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, total: true, allocations: { select: { amount: true } } },
    });

    const planned: AllocationInput[] = [];
    let remaining = amount;

    for (const invoice of open) {
      if (remaining <= 0) break;

      const allocated = invoice.allocations.reduce((sum, row) => sum + row.amount, 0);
      const outstanding = invoice.total - allocated;
      if (outstanding <= 0) continue;

      const take = Math.min(remaining, outstanding);
      planned.push({ invoiceId: invoice.id, amount: take });
      remaining -= take;
    }

    /*
      QOLGAN PUL TAQSIMLANMAY QOLADI — VA BU TO'G'RI.

      Diler qarzidan ko'p to'lasa, ortiqcha summa uning foydasiga
      balansda turadi. Uni zo'rlab biror hujjatga yopishtirish
      "110% to'langan hisob-faktura" degan ma'nosiz yozuv
      yaratardi.
    */
    return planned;
  }

  private withUnallocated<T extends { amount: number; allocations: { amount: number }[] }>(
    payment: T,
  ): T & { allocated: number; unallocated: number } {
    const allocated = payment.allocations.reduce((sum, row) => sum + row.amount, 0);

    return { ...payment, allocated, unallocated: payment.amount - allocated };
  }
}
