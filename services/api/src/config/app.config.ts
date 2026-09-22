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

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  /** Aniq yoqilmagan bo'lsa — production'da o'chiq, qolgan joyda yoniq. */
  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED') ?? !this.isProduction;
  }
}
