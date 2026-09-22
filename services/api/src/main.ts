import 'reflect-metadata';

import { type NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JsonLogger } from './common/logger/json.logger';
import { AppConfig } from './config/app.config';
import { validateEnv } from './config/env.schema';
import { GLOBAL_PREFIX, setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  // Muhit tekshiruvi Nest kontekstidan OLDIN: sozlama xato bo'lsa, xato
  // xabari Nest'ning ichki stack trace'i ostida ko'milib ketmasligi kerak.
  const env = validateEnv(process.env as Record<string, unknown>);
  const logger = new JsonLogger(env.LOG_LEVEL);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    bufferLogs: false,
  });
  const config = app.get(AppConfig);

  // Rate limiter va loglar mijozning HAQIQIY IP'siga tayanadi. Proksi ortida
  // bu `X-Forwarded-For` dan olinadi, lekin faqat ma'lum sondagi hop ishonchli
  // deb belgilangandagina — aks holda sarlavhani mijozning o'zi soxtalashtiradi.
  if (config.trustProxyHops > 0) {
    app.set('trust proxy', config.trustProxyHops);
  }

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.use(helmet());
  // HttpOnly cookie'lardagi token'larni o'qish uchun (S04).
  app.use(cookieParser());

  // Qat'iy CORS: ro'yxatdagi origin'lar bo'lmasa, brauzer so'rovlari o'tmaydi.
  // `credentials: true` — S04 dagi HttpOnly cookie'lar uchun; shu sababli
  // `origin: true` (hammaga ruxsat) qasddan ishlatilmaydi.
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Accept-Language'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  });

  if (config.swaggerEnabled) {
    setupSwagger(app, config);
  }

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');

  logger.log(
    `API ${config.nodeEnv} rejimida ${config.port}-portda ishga tushdi ` +
      `(/${GLOBAL_PREFIX}${config.swaggerEnabled ? `, docs: /${GLOBAL_PREFIX}/docs` : ''})`,
    'Bootstrap',
  );
}

void bootstrap();
