import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { type Role } from '@barff/types';
import { type StaffRole } from '@barff/validation';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { RefreshTokenStore } from '../auth/refresh-token.store';
import { runUnique } from '../common/run-unique';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { UserRolesService } from './user-roles.service';
import { UsersService } from './users.service';

interface Actor {
  id: string;
  email: string;
}

/**
 * Javobga CHIQADIGAN maydonlar. Ro'yxat ANIQ: `passwordHash` va `mfaSecret`
 * hech qachon tashqariga chiqmasligi uchun `select` bilan cheklanadi,
 * "hammasini olib keyin olib tashlash" bilan emas.
 */
const STAFF_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { code: true } } } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;

function toStaff(row: StaffRow) {
  const { roles, ...rest } = row;

  return { ...rest, roles: roles.map((item) => item.role.code).sort() };
}

/**
 * Xodimlar boshqaruvi.
 *
 * Diler akkauntlari bu yerda KO'RINMAYDI va o'zgartirilmaydi: ular ariza
 * oqimi (S22) orqali yaratiladi va tasdiqlanadi. Bu yerga faqat
 * `DEALER` roli YO'Q akkauntlar kiradi.
 *
 * Uchta himoya (lockout):
 *   - o'zingizni bloklab bo'lmaydi;
 *   - o'zingizdan `ADMIN` rolini olib bo'lmaydi;
 *   - tizimda KAMIDA BITTA faol admin qolishi shart.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly userRoles: UserRolesService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenStore,
    private readonly audit: AuditService,
  ) {}

  async list(query: { page: number; limit: number; search?: string | undefined }) {
    const request = toPageRequest(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      roles: { none: { role: { code: 'DEALER' } } },
      ...(query.search !== undefined
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: STAFF_SELECT,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items.map(toStaff), total, request);
  }

  /** Rollar ro'yxati — formadagi tanlov uchun (kod, nom, ruxsatlar soni). */
  async listRoles() {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: ['SALES', 'WAREHOUSE', 'LOGISTICS', 'DRIVER', 'ADMIN'] } },
      select: {
        code: true,
        name: true,
        description: true,
        _count: { select: { permissions: true } },
      },
      orderBy: { code: 'asc' },
    });

    return roles.map(({ _count, ...role }) => ({ ...role, permissionCount: _count.permissions }));
  }

  async create(
    input: {
      email: string;
      fullName: string;
      phone?: string | undefined;
      password: string;
      roles: readonly StaffRole[];
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const roles = await this.prisma.role.findMany({ where: { code: { in: [...input.roles] } } });

    if (roles.length !== input.roles.length) {
      throw new NotFoundException({ message: 'Rol topilmadi', code: 'UNKNOWN_ROLE' });
    }

    const passwordHash = await this.passwords.hash(input.password);

    const created = await runUnique(() =>
      this.prisma.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          passwordHash,
          roles: { create: roles.map((role) => ({ roleId: role.id, assignedById: actor.id })) },
        },
        select: STAFF_SELECT,
      }),
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_CREATED,
      entity: 'User',
      entityId: created.id,
      actorId: actor.id,
      actorEmail: actor.email,
      // Parol HECH QACHON yozilmaydi (CLAUDE.md §23).
      after: { email: created.email, roles: [...input.roles].sort() },
      ...ctx,
    });

    return toStaff(created);
  }

  async update(
    id: string,
    input: { fullName?: string; phone?: string | null; isActive?: boolean },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const before = await this.findStaff(id);

    if (input.isActive === false) {
      if (id === actor.id) {
        throw new ConflictException({
          message: "O'zingizni bloklab bo'lmaydi",
          code: 'CANNOT_DEACTIVATE_SELF',
        });
      }
      if (before.isActive) await this.assertNotLastAdmin(before);
    }

    const updated = await runUnique(() =>
      this.prisma.user.update({
        where: { id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        select: STAFF_SELECT,
      }),
    );

    await this.users.invalidate(id);
    // Bloklangan akkaunt amaldagi refresh token bilan qayta kira olmasligi kerak.
    if (input.isActive === false) await this.refreshTokens.revokeAllForUser(id);

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entity: 'User',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { fullName: before.fullName, phone: before.phone, isActive: before.isActive },
      after: { fullName: updated.fullName, phone: updated.phone, isActive: updated.isActive },
      ...ctx,
    });

    return toStaff(updated);
  }

  async setRoles(id: string, roles: readonly StaffRole[], actor: Actor, ctx: RequestContext) {
    const before = await this.findStaff(id);
    const wasAdmin = before.roles.some((item) => item.role.code === 'ADMIN');

    if (wasAdmin && !roles.includes('ADMIN')) {
      if (id === actor.id) {
        throw new ConflictException({
          message: "O'zingizdan admin rolini olib bo'lmaydi",
          code: 'CANNOT_DEMOTE_SELF',
        });
      }
      if (before.isActive) await this.assertNotLastAdmin(before);
    }

    await this.userRoles.setRoles(id, roles as readonly Role[], actor, ctx);
    // Rol o'zgarsa eski sessiyalar eski huquqlar bilan davom etmasin.
    await this.refreshTokens.revokeAllForUser(id);

    return toStaff(await this.findStaff(id));
  }

  async resetPassword(id: string, password: string, actor: Actor, ctx: RequestContext) {
    await this.findStaff(id);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await this.passwords.hash(password) },
    });

    await this.users.invalidate(id);
    await this.refreshTokens.revokeAllForUser(id);

    await this.audit.record({
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
      entity: 'User',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      ...ctx,
    });
  }

  private async findStaff(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, roles: { none: { role: { code: 'DEALER' } } } },
      select: STAFF_SELECT,
    });

    if (user === null) {
      throw new NotFoundException({ message: 'Xodim topilmadi', code: 'USER_NOT_FOUND' });
    }

    return user;
  }

  /** `target` faol admin bo'lsa va u OXIRGISI bo'lsa — to'xtatadi. */
  private async assertNotLastAdmin(target: StaffRow): Promise<void> {
    if (!target.roles.some((item) => item.role.code === 'ADMIN')) return;

    const others = await this.prisma.user.count({
      where: {
        id: { not: target.id },
        isActive: true,
        deletedAt: null,
        roles: { some: { role: { code: 'ADMIN' } } },
      },
    });

    if (others === 0) {
      throw new ConflictException({
        message: 'Tizimda kamida bitta faol admin qolishi shart',
        code: 'LAST_ADMIN',
      });
    }
  }
}
