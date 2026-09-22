import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env } from './env.schema';

/**
 * Tiplashtirilgan config. Kod `process.env` ga to'g'ridan-to'g'ri murojaat
 * qilmaydi — hamma narsa shu yerdan o'qiladi, shuning uchun har bir
 * o'zgaruvchi qayerda ishlatilayotganini kuzatish oson.
 */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get port(): number {
    return this.get('API_PORT');
  }

  get baseUrl(): string {
    return this.get('API_BASE_URL');
  }

  get corsOrigins(): readonly string[] {
    return this.get('API_CORS_ORIGINS');
  }

  get rateLimit(): { ttlSeconds: number; limit: number } {
    return {
      ttlSeconds: this.get('API_RATE_LIMIT_TTL'),
      limit: this.get('API_RATE_LIMIT_MAX'),
    };
  }

  /** API oldidagi ishonchli proksi soni. 0 — hech biriga ishonilmaydi. */
  get trustProxyHops(): number {
    return this.get('API_TRUST_PROXY_HOPS');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get jwt(): {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  } {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      accessTtl: this.get('JWT_ACCESS_TTL'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      refreshTtl: this.get('JWT_REFRESH_TTL'),
    };
  }

  /**
   * Cookie sozlamalari.
   *
   * `secure` production'da MAJBURIY: HTTPS'siz yuborilgan cookie tarmoqda
   * ochiq ketadi, shuning uchun uni muhit o'zgaruvchisi bilan production'da
   * o'chirib bo'lmaydi.
   */
  get cookie(): { domain?: string; secure: boolean; sameSite: 'lax' | 'strict' | 'none' } {
    const domain = this.get('COOKIE_DOMAIN');
    const secure = this.isProduction || (this.get('COOKIE_SECURE') ?? false);

    return {
      ...(domain !== undefined && domain.length > 0 ? { domain } : {}),
      secure,
      // Ilovalar turli subdomenlarda (partner./admin.) — `lax` bilan
      // navigatsiya so'rovlari o'tadi, CSRF yuzasi esa tor qoladi.
      sameSite: 'lax',
    };
  }

  get loginThrottle(): { maxAttempts: number; maxAttemptsPerIp: number; lockSeconds: number } {
    return {
      maxAttempts: this.get('AUTH_LOGIN_MAX_ATTEMPTS'),
      maxAttemptsPerIp: this.get('AUTH_LOGIN_MAX_ATTEMPTS_PER_IP'),
      lockSeconds: this.get('AUTH_LOGIN_LOCK_SECONDS'),
    };
  }

  get userCacheSeconds(): number {
    return this.get('AUTH_USER_CACHE_SECONDS');
  }

  /** S3 to'liq sozlanganmi. */
  get hasS3(): boolean {
    return (
      this.config.get('S3_BUCKET', { infer: true }) !== undefined &&
      this.config.get('S3_ACCESS_KEY_ID', { infer: true }) !== undefined &&
      this.config.get('S3_SECRET_ACCESS_KEY', { infer: true }) !== undefined
    );
  }

  get s3(): {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    publicUrl?: string;
  } {
    const endpoint = this.get('S3_ENDPOINT');
    const publicUrl = this.get('S3_PUBLIC_URL');

    return {
      ...(endpoint !== undefined ? { endpoint } : {}),
      region: this.get('S3_REGION'),
      bucket: this.get('S3_BUCKET') ?? '',
      accessKeyId: this.get('S3_ACCESS_KEY_ID') ?? '',
      secretAccessKey: this.get('S3_SECRET_ACCESS_KEY') ?? '',
      forcePathStyle: this.get('S3_FORCE_PATH_STYLE') ?? false,
      ...(publicUrl !== undefined ? { publicUrl } : {}),
    };
  }

  get media(): { maxBytes: number; signedUrlTtl: number } {
    return {
      maxBytes: this.get('MEDIA_MAX_BYTES'),
      signedUrlTtl: this.get('MEDIA_SIGNED_URL_TTL'),
    };
  }

  /** Aniq yoqilmagan bo'lsa — production'da o'chiq, qolgan joyda yoniq. */
  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED') ?? !this.isProduction;
  }
}
