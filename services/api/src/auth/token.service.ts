import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../config/app.config';
import {
  type AccessTokenPayload,
  type AuthenticatedUser,
  type RefreshTokenPayload,
} from './auth.types';
import { RefreshTokenStore } from './refresh-token.store';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly store: RefreshTokenStore,
  ) {}

  async signAccess(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    // Muddat SONIYADA beriladi (`ms` formatidagi matn emas): shu tufayli
    // JWT, Redis TTL va cookie maxAge bir xil qiymatdan kelib chiqadi va
    // ular bir-biridan farq qilib qolishi mumkin emas.
    return this.jwt.signAsync(payload, {
      secret: this.config.jwt.accessSecret,
      expiresIn: this.accessTtlSeconds(),
    });
  }

  /**
   * Yangi refresh token yaratadi va uni amaldagi token'lar ro'yxatiga qo'shadi.
   * `family` berilmasa — yangi sessiya boshlanadi.
   */
  async issueRefresh(userId: string, family?: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      jti: randomUUID(),
      family: family ?? randomUUID(),
    };

    const token = await this.jwt.signAsync(payload, {
      secret: this.config.jwt.refreshSecret,
      expiresIn: this.refreshTtlSeconds(),
    });

    await this.store.save(userId, payload.jti, payload.family, this.refreshTtlSeconds());

    return token;
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload | null> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.jwt.accessSecret,
      });
    } catch {
      // Muddati tugagan, imzosi noto'g'ri yoki buzilgan token — barchasi
      // mijoz uchun bir xil natija beradi: kirish yo'q.
      return null;
    }
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      return null;
    }
  }

  accessTtlSeconds(): number {
    return parseDuration(this.config.jwt.accessTtl);
  }

  refreshTtlSeconds(): number {
    return parseDuration(this.config.jwt.refreshTtl);
  }
}

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3_600, d: 86_400 };

/**
 * `15m`, `30d`, `3600` ko'rinishlarini soniyaga aylantiradi.
 *
 * JWT kutubxonasi bu formatni o'zi tushunadi, lekin bizga cookie `maxAge`
 * va Redis TTL uchun aynan SON kerak.
 */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (match === null) {
    throw new Error(`Noto'g'ri muddat formati: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';

  return amount * (UNITS[unit] ?? 1);
}
