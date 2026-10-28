import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfig } from './app.config';
import { validateEnv } from './env.schema';
import { localEnvFilePath } from './repo-root';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Repo ildizidagi `.env` — barcha ilovalar uchun bitta manba.
      // Yo'l fayl joylashuvidan hisoblanadi, CWD'dan emas: aks holda
      // ilova qaysi katalogdan ishga tushirilganiga qarab boshqa fayl
      // yuklanardi (yoki umuman yuklanmasdi).
      // Serverda (cPanel/VPS) `npm run setup` ilova ildiziga `.env` yozadi:
      // `dist/config/` dan ikki pog'ona yuqori. Haqiqiy muhit o'zgaruvchilari
      // fayldan USTUN turadi. Lokal ishlab chiqishda bu yo'l mavjud emas.
      envFilePath: [...localEnvFilePath(), join(__dirname, '..', '..', '.env')],
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class ConfigModule {}
