import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { type AuthenticatedUser } from '../auth.types';
import { type RequestWithUser } from '../auth.request';

/** Controller'da joriy foydalanuvchini olish uchun. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
