import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ZodValidationPipe } from './common/validation/zod-validation.pipe';
import { AppConfig } from './config/app.config';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ContentModule } from './content/content.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CacheModule } from './public/cache/cache.module';
import { MediaModule } from './media/media.module';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    /**
     * Rate limiting (CLAUDE.md §12).
     *
     * Hisoblagich instansiya XOTIRASIDA saqlanadi: 3 ta ECS task bo'lsa,
     * amaldagi limit 3 barobar yuqori bo'ladi. Bu birinchi qatlam sifatida
     * yetarli — asosiy himoya Cloudflare WAF darajasida (CLAUDE.md §13).
     * Taqsimlangan hisoblagichga o'tish S41 da ko'rib chiqiladi (Q19).
     */
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        {
          ttl: config.rateLimit.ttlSeconds * 1_000,
          limit: config.rateLimit.limit,
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    CacheModule,
    UsersModule,
    AuditModule,
    AuthModule,
    MediaModule,
    ProductsModule,
    ContentModule,
    NotificationsModule,
    LeadsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*splat');
  }
}
