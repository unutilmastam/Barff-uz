import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  email: string;
}

const DRIVER_SELECT = {
  id: true,
  licenseNumber: true,
  isActive: true,
  notes: true,
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  vehicle: { select: { id: true, plateNumber: true, model: true } },
  _count: { select: { deliveries: true } },
} as const;

/**
 * Haydovchilar va mashinalar (CLAUDE.md §6).
 *
 * HAYDOVCHI PROFILI KIRISH HUQUQI BERMAYDI. Huquq `DRIVER` roli
 * bilan beriladi va uni admin ALOHIDA beradi. Ikkalasini bitta
 * amalga qo'shish "rol bermay profil yaratish" xatosini
 * yashirardi: profil bor, lekin haydovchi tizimga kira olmaydi va
 * sabab ko'rinmaydi.
 *
 * Shuning uchun profil yaratishda rol TEKSHIRILADI va yo'q bo'lsa
 * ochiq aytiladi.
 */
@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------- mashinalar

  listVehicles(includeInactive = false) {
    return this.prisma.vehicle.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { plateNumber: 'asc' },
      select: {
        id: true,
        plateNumber: true,
        model: true,
        capacityKg: true,
        isActive: true,
        notes: true,
      },
    });
  }

  async createVehicle(
    input: {
      plateNumber: string;
      model?: string | undefined;
      capacityKg?: number | undefined;
      isActive?: boolean | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const vehicle = await this.prisma.vehicle
      .create({
        data: {
          plateNumber: input.plateNumber,
          ...(input.model !== undefined ? { model: input.model } : {}),
          ...(input.capacityKg !== undefined ? { capacityKg: input.capacityKg } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        select: { id: true, plateNumber: true, model: true, isActive: true },
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            message: 'Bu davlat raqami band',
            code: 'VEHICLE_PLATE_EXISTS',
          });
        }

        throw error;
      });

    await this.record(AUDIT_ACTIONS.VEHICLE_CHANGED, 'vehicle', vehicle.id, actor, ctx, vehicle);

    return vehicle;
  }

  async updateVehicle(
    id: string,
    input: {
      plateNumber?: string | undefined;
      model?: string | undefined;
      capacityKg?: number | undefined;
      isActive?: boolean | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const existing = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (existing === null) {
      throw new NotFoundException({ message: 'Mashina topilmadi', code: 'VEHICLE_NOT_FOUND' });
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.capacityKg !== undefined ? { capacityKg: input.capacityKg } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      select: { id: true, plateNumber: true, model: true, isActive: true },
    });

    await this.record(AUDIT_ACTIONS.VEHICLE_CHANGED, 'vehicle', id, actor, ctx, updated);

    return updated;
  }

  // ------------------------------------------------------------ haydovchilar

  listDrivers(includeInactive = false) {
    return this.prisma.driver.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { user: { fullName: 'asc' } },
      select: DRIVER_SELECT,
    });
  }

  async createDriver(
    input: {
      userId: string;
      licenseNumber?: string | undefined;
      vehicleId?: string | null | undefined;
      isActive?: boolean | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    /*
      ROL TEKSHIRILADI.

      Profil yaratib, `DRIVER` rolini unutish — jim ishlamaydigan
      holat: profil bor, yetkazma biriktiriladi, lekin haydovchi
      tizimga kira olmaydi. Buni ochiq aytish kerak.
    */
    const user = await this.prisma.user.findFirst({
      where: { id: input.userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        roles: { select: { role: { select: { code: true } } } },
      },
    });

    if (user === null) {
      throw new BadRequestException({
        message: 'Foydalanuvchi topilmadi',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.roles.some((entry) => entry.role.code === 'DRIVER')) {
      throw new BadRequestException({
        message: `${user.fullName} da HAYDOVCHI roli yo'q — avval rolni bering`,
        code: 'DRIVER_ROLE_MISSING',
      });
    }

    const driver = await this.prisma.driver
      .create({
        data: {
          userId: input.userId,
          ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
          ...(input.vehicleId != null ? { vehicleId: input.vehicleId } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        select: DRIVER_SELECT,
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            message: 'Bu foydalanuvchida haydovchi profili allaqachon bor',
            code: 'DRIVER_EXISTS',
          });
        }

        throw error;
      });

    await this.record(AUDIT_ACTIONS.DRIVER_CHANGED, 'driver', driver.id, actor, ctx, {
      userId: input.userId,
    });

    return driver;
  }

  async updateDriver(
    id: string,
    input: {
      licenseNumber?: string | undefined;
      vehicleId?: string | null | undefined;
      isActive?: boolean | undefined;
      notes?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const existing = await this.prisma.driver.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (existing === null) {
      throw new NotFoundException({ message: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
        ...(input.vehicleId !== undefined
          ? input.vehicleId === null
            ? { vehicle: { disconnect: true } }
            : { vehicle: { connect: { id: input.vehicleId } } }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      select: DRIVER_SELECT,
    });

    await this.record(AUDIT_ACTIONS.DRIVER_CHANGED, 'driver', id, actor, ctx, {
      isActive: updated.isActive,
    });

    return updated;
  }

  /** `DRIVER` roli bor, lekin profili YO'Q foydalanuvchilar. */
  candidates() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        driver: null,
        roles: { some: { role: { code: 'DRIVER' } } },
      },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true, phone: true },
    });
  }

  private async record(
    action: string,
    entity: string,
    entityId: string,
    actor: Actor,
    ctx: RequestContext,
    after: unknown,
  ): Promise<void> {
    await this.audit.record({
      action,
      entity,
      entityId,
      actorId: actor.id,
      actorEmail: actor.email,
      after: after as Record<string, unknown>,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });
  }
}
