import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Permission } from '@barff/types';
import { type RequestWithUser } from '../auth.request';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/** `@Permissions()` tekshiruvi — sanab o'tilganlarning BARCHASI kerak. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required === undefined || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;

    if (user === undefined) {
      throw new ForbiddenException({ message: "Ruxsat yo'q", code: 'FORBIDDEN' });
    }

    const missing = required.filter((permission) => !user.permissions.includes(permission));

    if (missing.length > 0) {
      // Qaysi ruxsat yetishmagani javobda KO'RSATILMAYDI — bu ichki
      // huquqlar tuzilishini oshkor qilardi. Tafsilot faqat audit va logda.
      throw new ForbiddenException({
        message: "Bu amal uchun ruxsatingiz yo'q",
        code: 'FORBIDDEN_PERMISSION',
      });
    }

    return true;
  }
}
