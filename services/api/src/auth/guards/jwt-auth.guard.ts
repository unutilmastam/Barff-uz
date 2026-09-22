import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../users/users.service';
import { type RequestWithUser } from '../auth.request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';

export const ACCESS_TOKEN_COOKIE = 'barff_access';

/**
 * Access token tekshiruvi.
 *
 * Token IKKI joydan qabul qilinadi:
 *  - `Authorization: Bearer ...` — mobil/server mijozlar uchun;
 *  - HttpOnly cookie          — brauzer ilovalari uchun (XSS'da o'qib
 *    bo'lmaydi, chunki JavaScript unga kira olmaydi).
 *
 * MUHIM: token to'g'ri bo'lsa ham, foydalanuvchi bazadan QAYTA o'qiladi.
 * Rollar token ichidagi nusxadan olinmaydi — admin huquqni olib tashlasa,
 * o'zgarish darhol kuchga kirishi kerak.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractToken(request);

    if (token === undefined) {
      throw new UnauthorizedException({
        message: 'Avtorizatsiya talab qilinadi',
        code: 'UNAUTHENTICATED',
      });
    }

    const payload = await this.tokens.verifyAccess(token);
    if (payload === null) {
      throw new UnauthorizedException({
        message: 'Token yaroqsiz yoki muddati tugagan',
        code: 'INVALID_TOKEN',
      });
    }

    const user = await this.users.findAuthenticated(payload.sub);
    if (user === null) {
      throw new UnauthorizedException({
        message: 'Akkaunt mavjud emas yoki faol emas',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    request.user = user;
    return true;
  }
}

function extractToken(request: RequestWithUser): string | undefined {
  const header = request.headers.authorization;

  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const value = header.slice('Bearer '.length).trim();
    if (value.length > 0) return value;
  }

  return request.cookies?.[ACCESS_TOKEN_COOKIE];
}
