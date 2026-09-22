import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Role } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { RefreshTokenStore } from '../auth/refresh-token.store';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

/**
 * Rol biriktirish va olib tashlash.
 *
 * HTTP endpoint'i S19 da (admin foydalanuvchilar boshqaruvi) qo'shiladi;
 * amalning o'zi shu yerda, chunki u uchta narsani BIRGA bajarishi shart:
 * bazani yangilash, audit yozuvi va ruxsat keshini bekor qilish. Uchalasi
 * bir joyda bo'lmasa, birortasi unutilishi aniq.
 */
@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly refreshTokens: RefreshTokenStore,
  ) {}

  async setRoles(
    userId: string,
    roleCodes: readonly Role[],
    actor: { id: string; email: string },
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });

    if (user === null) {
      throw new NotFoundException({ message: 'Foydalanuvchi topilmadi', code: 'USER_NOT_FOUND' });
    }

    const roles = await this.prisma.role.findMany({ where: { code: { in: [...roleCodes] } } });

    if (roles.length !== roleCodes.length) {
      const found = new Set(roles.map((r) => r.code));
      const missing = roleCodes.filter((code) => !found.has(code));
      throw new BadRequestException({
        message: `Noma'lum rol: ${missing.join(', ')}`,
        code: 'UNKNOWN_ROLE',
      });
    }

    const before = user.roles.map((ur) => ur.role.code).sort();
    const after = [...roleCodes].sort();

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId, roleId: role.id, assignedById: actor.id })),
      }),
    ]);

    // Kesh bekor qilinmasa, foydalanuvchi eski huquqlar bilan
    // `AUTH_USER_CACHE_SECONDS` davomida ishlayverardi.
    await this.users.invalidate(userId);

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      entity: 'User',
      entityId: userId,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { roles: before },
      after: { roles: after },
      ...ctx,
    });
  }

  /**
   * Akkauntni bloklash.
   *
   * Rol o'zgarishidan farqli o'laroq, bu yerda barcha sessiyalar ham bekor
   * qilinadi: bloklangan foydalanuvchi amaldagi refresh token bilan yangi
   * access token olishga urinmasligi kerak.
   */
  async deactivate(
    userId: string,
    actor: { id: string; email: string },
    ctx: RequestContext,
  ): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });

    await this.users.invalidate(userId);
    await this.refreshTokens.revokeAllForUser(userId);

    await this.audit.record({
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      entity: 'User',
      entityId: userId,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { isActive: false },
      ...ctx,
    });
  }
}
