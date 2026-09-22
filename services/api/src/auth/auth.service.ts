import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { UsersService, toAuthenticatedUser } from '../users/users.service';
import { type AuthTokens, type AuthenticatedUser } from './auth.types';
import { LoginAttemptService } from './login-attempt.service';
import { PasswordService } from './password.service';
import { RefreshTokenStore } from './refresh-token.store';
import { TokenService } from './token.service';

/** So'rov haqida audit uchun kerakli ma'lumot. */
export interface RequestContext {
  ip: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Kirish xatosi HAR DOIM bir xil.
 *
 * "Bunday foydalanuvchi yo'q" va "parol noto'g'ri" javoblarini ajratish
 * qaysi emaillar ro'yxatdan o'tganini aniqlashga imkon berardi.
 */
const INVALID_CREDENTIALS = "Email yoki parol noto'g'ri";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly store: RefreshTokenStore,
    private readonly attempts: LoginAttemptService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ctx: RequestContext,
  ): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    if (await this.attempts.isLocked(email, ctx.ip)) {
      await this.audit.record({
        action: AUDIT_ACTIONS.LOGIN_LOCKED,
        entity: 'User',
        actorEmail: email,
        ...this.auditContext(ctx),
      });

      throw new ForbiddenException({
        message: "Urinishlar soni oshib ketdi. Birozdan so'ng qayta urinib ko'ring.",
        code: 'LOGIN_LOCKED',
      });
    }

    const user = await this.users.findForLogin(email);

    if (user === null) {
      // Foydalanuvchi topilmasa ham argon2 ishlatiladi — javob vaqti
      // mavjud foydalanuvchinikidan farq qilmasligi uchun.
      await this.passwords.burnTime();
      await this.registerFailure(email, ctx);
      throw new UnauthorizedException({
        message: INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const passwordOk = await this.passwords.verify(user.passwordHash, password);

    if (!passwordOk) {
      await this.registerFailure(email, ctx);
      throw new UnauthorizedException({
        message: INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      // Bloklangan akkaunt uchun ALOHIDA xabar beriladi: bu holatda parol
      // allaqachon to'g'ri kiritilgan, ya'ni yangi ma'lumot oshkor bo'lmaydi,
      // foydalanuvchi esa nima uchun kira olmayotganini biladi.
      await this.audit.record({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: 'User',
        entityId: user.id,
        actorEmail: user.email,
        after: { reason: 'inactive' },
        ...this.auditContext(ctx),
      });

      throw new ForbiddenException({
        message: "Akkaunt faol emas. Administrator bilan bog'laning.",
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const authenticated = toAuthenticatedUser(user);

    await this.attempts.reset(email, ctx.ip);
    await this.users.markLoggedIn(user.id);

    const tokens = await this.issueTokens(authenticated);

    await this.audit.record({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      entity: 'User',
      entityId: user.id,
      actorId: user.id,
      actorEmail: user.email,
      ...this.auditContext(ctx),
    });

    return { tokens, user: authenticated };
  }

  /**
   * Refresh token'ni almashtiradi (rotation).
   *
   * Eski token darhol bekor qilinadi. Allaqachon ishlatilgan token qayta
   * kelsa — sessiya o'g'irlangan deb hisoblanib, butun oila bekor qilinadi.
   */
  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<{ tokens: AuthTokens; user: AuthenticatedUser }> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    if (payload === null) {
      throw new UnauthorizedException({
        message: 'Sessiya muddati tugagan. Qaytadan kiring.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const family = await this.store.consume(payload.sub, payload.jti);

    if (family === null) {
      // Token imzosi to'g'ri, lekin ro'yxatda yo'q: yo chiqib ketilgan,
      // yo allaqachon almashtirilgan. Ikkinchi holat — o'g'irlanish belgisi.
      if (await this.store.isFamilyActive(payload.sub, payload.family)) {
        await this.store.revokeFamily(payload.sub, payload.family);

        await this.audit.record({
          action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
          entity: 'User',
          entityId: payload.sub,
          actorId: payload.sub,
          ...this.auditContext(ctx),
        });

        this.logger.warn(`Ishlatilgan refresh token qayta taqdim etildi: user=${payload.sub}`);
      }

      throw new UnauthorizedException({
        message: 'Sessiya muddati tugagan. Qaytadan kiring.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    if (!(await this.store.isFamilyActive(payload.sub, family))) {
      throw new UnauthorizedException({
        message: 'Sessiya bekor qilingan. Qaytadan kiring.',
        code: 'SESSION_REVOKED',
      });
    }

    const user = await this.users.findAuthenticated(payload.sub);
    if (user === null) {
      // Foydalanuvchi bloklangan yoki o'chirilgan — token amal qilsa ham
      // yangi juftlik berilmaydi.
      await this.store.revokeFamily(payload.sub, family);
      throw new UnauthorizedException({ message: 'Akkaunt mavjud emas', code: 'ACCOUNT_INACTIVE' });
    }

    const tokens = await this.issueTokens(user, family);

    await this.audit.record({
      action: AUDIT_ACTIONS.TOKEN_REFRESH,
      entity: 'User',
      entityId: user.id,
      actorId: user.id,
      actorEmail: user.email,
      ...this.auditContext(ctx),
    });

    return { tokens, user };
  }

  /** Chiqish: joriy sessiya (oila) butunlay bekor qilinadi. */
  async logout(refreshToken: string | undefined, ctx: RequestContext): Promise<void> {
    if (refreshToken === undefined) return;

    const payload = await this.tokens.verifyRefresh(refreshToken);
    if (payload === null) return;

    await this.store.consume(payload.sub, payload.jti);
    await this.store.revokeFamily(payload.sub, payload.family);

    await this.audit.record({
      action: AUDIT_ACTIONS.LOGOUT,
      entity: 'User',
      entityId: payload.sub,
      actorId: payload.sub,
      ...this.auditContext(ctx),
    });
  }

  private async issueTokens(user: AuthenticatedUser, family?: string): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.issueRefresh(user.id, family),
    ]);

    return { accessToken, refreshToken, expiresIn: this.tokens.accessTtlSeconds() };
  }

  private async registerFailure(email: string, ctx: RequestContext): Promise<void> {
    const count = await this.attempts.registerFailure(email, ctx.ip);

    await this.audit.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entity: 'User',
      actorEmail: email,
      after: { attempt: count },
      ...this.auditContext(ctx),
    });
  }

  private auditContext(ctx: RequestContext): {
    ip: string;
    userAgent?: string;
    requestId?: string;
  } {
    return {
      ip: ctx.ip,
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
      ...(ctx.requestId !== undefined ? { requestId: ctx.requestId } : {}),
    };
  }
}
