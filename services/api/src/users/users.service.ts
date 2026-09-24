import { Injectable } from '@nestjs/common';
import { type Permission, type Role } from '@barff/types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AppConfig } from '../config/app.config';
import { type AuthenticatedUser } from '../auth/auth.types';

/** Ma'lumotlar bazasidan rol va ruxsatlari bilan birga o'qish uchun. */
const USER_WITH_ACCESS = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: AppConfig,
  ) {}

  private cacheKey(userId: string): string {
    return `auth:user:${userId}`;
  }

  /** Kirish uchun: parol hash'i bilan birga. Kesh ISHLATILMAYDI. */
  async findForLogin(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: USER_WITH_ACCESS,
    });
  }

  /**
   * So'rov kontekstidagi foydalanuvchi.
   *
   * Har bir so'rovda bazaga tushmaslik uchun qisqa muddatli kesh ishlatiladi.
   * Kesh MUDDATI qisqa va rol o'zgarganda `invalidate()` bilan darhol
   * tozalanadi — shuning uchun huquq o'zgarishi kechikmaydi.
   *
   * Faol bo'lmagan yoki o'chirilgan foydalanuvchi uchun `null` qaytadi, ya'ni
   * token hali amal qilsa ham kirish to'xtaydi.
   */
  async findAuthenticated(userId: string): Promise<AuthenticatedUser | null> {
    const ttl = this.config.userCacheSeconds;
    const key = this.cacheKey(userId);

    if (ttl > 0) {
      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as AuthenticatedUser;
      }
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: USER_WITH_ACCESS,
    });

    if (user === null) return null;

    const authenticated = toAuthenticatedUser(user);

    if (ttl > 0) {
      await this.redis.set(key, JSON.stringify(authenticated), ttl);
    }

    return authenticated;
  }

  /** Rol/holat o'zgarganda chaqiriladi — keyingi so'rov yangi huquqlarni oladi. */
  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }

  async markLoggedIn(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

type UserWithAccess = {
  id: string;
  email: string;
  fullName: string;
  roles: { role: { code: string; permissions: { permission: { code: string } }[] } }[];
};

export function toAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
  const roles = user.roles.map((ur) => ur.role.code as Role);

  // Bir xil ruxsat bir necha roldan kelishi mumkin — takrorlar olib tashlanadi.
  const permissions = [
    ...new Set(
      user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code as Permission)),
    ),
  ];

  return { id: user.id, email: user.email, fullName: user.fullName, roles, permissions };
}
