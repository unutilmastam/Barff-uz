import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from './delivery.service';

interface Actor {
  id: string;
  email: string;
}

/** Marshrut ichidagi yetkazma — logist uchun yetarli minimum. */
const ROUTE_SELECT = {
  id: true,
  code: true,
  name: true,
  scheduledFor: true,
  notes: true,
  createdAt: true,
  driver: { select: { id: true, user: { select: { id: true, fullName: true, phone: true } } } },
  vehicle: { select: { id: true, plateNumber: true, model: true } },
  deliveries: {
    where: { deletedAt: null },
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      status: true,
      shippingLabel: true,
      shippingRegion: true,
      shippingAddress: true,
      driver: { select: { id: true, user: { select: { fullName: true } } } },
    },
  },
} as const satisfies Prisma.DeliveryRouteSelect;

/** Yopilgan yetkazma marshrutga qo'shilmaydi — qo'shishdan maqsad yo'q. */
const CLOSED = ['DELIVERED', 'CANCELLED'];

/**
 * Marshrutlar — KUNLIK GURUH (CLAUDE.md §6, `ROADMAP.md` S34).
 *
 * MARSHRUT BIRIKTIRISH EMAS.
 *
 * Marshrutda ham haydovchi bor, yetkazmada ham. Ikkalasini
 * avtomatik moslashtirish "kim olib ketyapti" degan savolga IKKITA
 * javob berardi: marshrutdagi haydovchi bugun kasal bo'lib, bitta
 * yetkazma boshqasiga o'tkazilsa, qaysi biri to'g'ri ekani
 * ko'rinmasdi.
 *
 * Shuning uchun marshrut — REJA (kim, qaysi kun, qaysi yo'nalish),
 * biriktirish esa har bir yetkazmada ALOHIDA va OSHKORA. Logist
 * xohlasa bitta amal bilan butun marshrutni biriktiradi
 * (`assignAll`), lekin u ham o'sha `assign` yo'lidan o'tadi:
 * tarix, audit va holat o'tishi bir xil bo'ladi.
 */
@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly delivery: DeliveryService,
  ) {}

  /**
   * Kun bo'yicha marshrutlar.
   *
   * Sana KUN chegarasi bo'yicha olinadi: `scheduledFor` — vaqtli
   * ustun, va `= '2026-09-30'` bilan solishtirish faqat yarim
   * tundagi yozuvni topardi.
   */
  list(date?: Date | undefined) {
    const where: Prisma.DeliveryRouteWhereInput = { deletedAt: null };

    if (date !== undefined) {
      const from = new Date(date);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      where.scheduledFor = { gte: from, lt: to };
    }

    return this.prisma.deliveryRoute.findMany({
      where,
      orderBy: [{ scheduledFor: 'desc' }, { code: 'asc' }],
      select: ROUTE_SELECT,
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id, deletedAt: null },
      select: ROUTE_SELECT,
    });

    if (route === null) {
      throw new NotFoundException({ message: 'Marshrut topilmadi', code: 'ROUTE_NOT_FOUND' });
    }

    return route;
  }

  async create(
    input: {
      code: string;
      name: string;
      scheduledFor: Date;
      driverId?: string | null | undefined;
      vehicleId?: string | null | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    await this.checkFleet(input.driverId, input.vehicleId);

    const route = await this.prisma.deliveryRoute
      .create({
        data: {
          code: input.code,
          name: input.name,
          scheduledFor: input.scheduledFor,
          ...(input.driverId !== undefined && input.driverId !== null
            ? { driverId: input.driverId }
            : {}),
          ...(input.vehicleId !== undefined && input.vehicleId !== null
            ? { vehicleId: input.vehicleId }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        select: ROUTE_SELECT,
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            message: 'Bu marshrut kodi band',
            code: 'ROUTE_CODE_EXISTS',
          });
        }

        throw error;
      });

    await this.record(AUDIT_ACTIONS.ROUTE_CHANGED, route.id, actor, ctx, {
      code: route.code,
      name: route.name,
      scheduledFor: route.scheduledFor,
    });

    return route;
  }

  async update(
    id: string,
    input: {
      code?: string | undefined;
      name?: string | undefined;
      scheduledFor?: Date | undefined;
      driverId?: string | null | undefined;
      vehicleId?: string | null | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    await this.findOne(id);
    await this.checkFleet(input.driverId, input.vehicleId);

    const updated = await this.prisma.deliveryRoute
      .update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.scheduledFor !== undefined ? { scheduledFor: input.scheduledFor } : {}),
          ...(input.driverId !== undefined
            ? input.driverId === null
              ? { driver: { disconnect: true } }
              : { driver: { connect: { id: input.driverId } } }
            : {}),
          ...(input.vehicleId !== undefined
            ? input.vehicleId === null
              ? { vehicle: { disconnect: true } }
              : { vehicle: { connect: { id: input.vehicleId } } }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        select: ROUTE_SELECT,
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            message: 'Bu marshrut kodi band',
            code: 'ROUTE_CODE_EXISTS',
          });
        }

        throw error;
      });

    await this.record(AUDIT_ACTIONS.ROUTE_CHANGED, id, actor, ctx, {
      code: updated.code,
      name: updated.name,
      scheduledFor: updated.scheduledFor,
    });

    return updated;
  }

  /**
   * Yetkazmalarni marshrutga qo'shish.
   *
   * Bu HOLAT o'zgartirmaydi va haydovchi biriktirmaydi — faqat
   * guruhlaydi.
   */
  async attach(id: string, deliveryIds: string[], actor: Actor, ctx: RequestContext) {
    await this.findOne(id);

    const found = await this.prisma.delivery.findMany({
      where: { id: { in: deliveryIds }, deletedAt: null },
      select: { id: true, number: true, status: true },
    });

    if (found.length !== deliveryIds.length) {
      throw new BadRequestException({
        message: 'Ba’zi yetkazmalar topilmadi',
        code: 'DELIVERY_NOT_FOUND',
      });
    }

    const closed = found.filter((row) => CLOSED.includes(row.status));

    if (closed.length > 0) {
      throw new BadRequestException({
        message: `Yopilgan yetkazmani marshrutga qo‘shib bo‘lmaydi: ${closed
          .map((row) => row.number)
          .join(', ')}`,
        code: 'DELIVERY_CLOSED',
      });
    }

    await this.prisma.delivery.updateMany({
      where: { id: { in: deliveryIds } },
      data: { routeId: id },
    });

    await this.record(AUDIT_ACTIONS.ROUTE_DELIVERIES_CHANGED, id, actor, ctx, {
      attached: found.map((row) => row.number),
    });

    return this.findOne(id);
  }

  /** Marshrutdan chiqarish — yetkazmaning O'ZIGA tegmaydi. */
  async detach(id: string, deliveryId: string, actor: Actor, ctx: RequestContext) {
    await this.findOne(id);

    const { count } = await this.prisma.delivery.updateMany({
      where: { id: deliveryId, routeId: id, deletedAt: null },
      data: { routeId: null },
    });

    if (count === 0) {
      throw new NotFoundException({
        message: 'Yetkazma bu marshrutda emas',
        code: 'DELIVERY_NOT_IN_ROUTE',
      });
    }

    await this.record(AUDIT_ACTIONS.ROUTE_DELIVERIES_CHANGED, id, actor, ctx, {
      detached: deliveryId,
    });

    return this.findOne(id);
  }

  /**
   * Marshrut haydovchisini uning YETKAZMALARIGA biriktirish.
   *
   * ALLAQACHON BIRIKTIRILGANLARGA TEGILMAYDI. Logist bitta
   * yetkazmani ataylab boshqa haydovchiga bergan bo'lishi mumkin,
   * va "hammasini biriktirish" o'sha qarorni jim bekor qilardi.
   *
   * Har bir yetkazma odatdagi `assign` yo'lidan o'tadi: holat
   * o'tishi, tarix va audit bir xil bo'ladi.
   */
  async assignAll(id: string, actor: Actor, ctx: RequestContext) {
    const route = await this.findOne(id);

    if (route.driver === null) {
      throw new BadRequestException({
        message: 'Marshrutda haydovchi belgilanmagan',
        code: 'ROUTE_DRIVER_MISSING',
      });
    }

    const targets = route.deliveries.filter(
      (row) => row.driver === null && !CLOSED.includes(row.status),
    );

    for (const target of targets) {
      await this.delivery.assign(
        target.id,
        {
          driverId: route.driver.id,
          ...(route.vehicle !== null ? { vehicleId: route.vehicle.id } : {}),
          scheduledFor: route.scheduledFor,
        },
        actor,
        ctx,
      );
    }

    return { assigned: targets.length, route: await this.findOne(id) };
  }

  /** Haydovchi va mashina MAVJUD va FAOL ekanini tekshiradi. */
  private async checkFleet(
    driverId?: string | null | undefined,
    vehicleId?: string | null | undefined,
  ): Promise<void> {
    if (driverId !== undefined && driverId !== null) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: driverId, deletedAt: null, isActive: true },
        select: { id: true },
      });

      if (driver === null) {
        throw new BadRequestException({
          message: 'Haydovchi topilmadi yoki faol emas',
          code: 'DRIVER_NOT_FOUND',
        });
      }
    }

    if (vehicleId !== undefined && vehicleId !== null) {
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
      entity: 'delivery_route',
      entityId,
      actorId: actor.id,
      actorEmail: actor.email,
      after,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });
  }
}
