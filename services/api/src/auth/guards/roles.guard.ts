import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Role } from '@barff/types';
import { type RequestWithUser } from '../auth.request';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** `@Roles()` tekshiruvi — sanab o'tilganlardan kamida bittasi yetarli. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required === undefined || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;

    // Guard `JwtAuthGuard` dan KEYIN ishlaydi, shuning uchun bu yerda
    // foydalanuvchi bo'lmasligi konfiguratsiya xatosi demakdir.
    if (user === undefined) {
      throw new ForbiddenException({ message: "Ruxsat yo'q", code: 'FORBIDDEN' });
    }

    if (!required.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException({
        message: "Bu amal uchun ruxsatingiz yo'q",
        code: 'FORBIDDEN_ROLE',
      });
    }

    return true;
  }
}
