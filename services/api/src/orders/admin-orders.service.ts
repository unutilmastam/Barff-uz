import { Injectable, NotFoundException } from '@nestjs/common';
import { type OrderStatus, type Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminOrderQuery {
  page: number;
  limit: number;
  status?: OrderStatus | undefined;
  dealerId?: string | undefined;
  region?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  search?: string | undefined;
}

interface Actor {
  id: string;
  email: string;
}

/**
 * Buyurtmalarni yuritish — xodimlar tomoni (CLAUDE.md §8).
 *
 * DILER TOMONIDAN FARQI: bu yerda `dealerId` FILTR, kirish shartiga
 * emas. Xodim barcha buyurtmalarni ko'radi va ruxsat `@Permissions`
 * bilan endpoint darajasida tekshiriladi.
 */
@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdminOrderQuery) {
    const request = toPageRequest(query);

    /*
      SANA ORALIG'I: `to` KUN OXIRIGACHA.

      `createdAt <= to` bilan `to = 2026-09-24` berilsa, o'sha kunning
      00:00 dan keyingi buyurtmalar TUSHIB QOLARDI — xodim "bugungi
      buyurtmalar" ni so'rab bo'sh ro'yxat ko'rardi.
    */
    const to = query.to === undefined ? undefined : endOfDay(query.to);

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.dealerId !== undefined ? { dealerId: query.dealerId } : {}),
      // Hudud buyurtmaning O'ZIDAN (nusxa), dilernikidan emas:
      // buyurtma boshqa hududdagi manzilga ketgan bo'lishi mumkin.
      ...(query.region !== undefined
        ? { shippingRegion: { contains: query.region, mode: 'insensitive' } }
        : {}),
      ...(query.search !== undefined
        ? { number: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.from !== undefined || to !== undefined
        ? {
            createdAt: {
              ...(query.from !== undefined ? { gte: query.from } : {}),
              ...(to !== undefined ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        include: {
          dealer: { select: { id: true, companyName: true, region: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        dealer: {
          select: {
            id: true,
            companyName: true,
            region: true,
            taxId: true,
            status: true,
            tier: { select: { code: true, name: true, discountBasisPoints: true } },
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        items: { orderBy: { createdAt: 'asc' } },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    return order;
  }

  /** Filtr uchun dilerlar ro'yxati — faqat buyurtmasi borlari. */
  dealersWithOrders() {
    return this.prisma.dealer.findMany({
      where: { deletedAt: null, orders: { some: { deletedAt: null } } },
      orderBy: { companyName: 'asc' },
      select: { id: true, companyName: true },
    });
  }

  /**
   * Xodimlar izohi.
   *
   * Dilerga QAYTARILMAYDI — `OrdersService.ORDER_SELECT` da bu
   * maydon ataylab yo'q va bu test bilan qoplangan.
   */
  async setInternalNote(id: string, note: string, actor: Actor, ctx: RequestContext) {
    const before = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, internalNote: true },
    });

    if (before === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { internalNote: note.length === 0 ? null : note },
      select: { id: true, internalNote: true },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ORDER_NOTE_CHANGED,
      entity: 'order',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { internalNote: before.internalNote },
      after: { internalNote: order.internalNote },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return order;
  }
}

/** Kun oxiri — sana filtri chegarasi uchun. */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}
