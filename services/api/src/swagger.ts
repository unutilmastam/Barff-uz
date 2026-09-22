import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type AppConfig } from './config/app.config';

export const GLOBAL_PREFIX = 'api/v1';

export function setupSwagger(app: INestApplication, config: AppConfig): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('BARFF API')
      .setDescription('BARFF platformasi REST API (CLAUDE.md §11)')
      .setVersion('1.0')
      // Yo'llar hujjatda global prefiks bilan chiqadi, shuning uchun
      // server manzilida uni TAKRORLAMAYMIZ.
      .addServer(config.baseUrl)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build(),
  );

  SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
