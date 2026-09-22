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
      envFilePath: localEnvFilePath(),
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class ConfigModule {}
