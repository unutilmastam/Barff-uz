import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginAttemptService } from './login-attempt.service';
import { PasswordService } from './password.service';
import { RefreshTokenStore } from './refresh-token.store';
import { TokenService } from './token.service';

/**
 * Guard'lar GLOBAL ro'yxatga qo'yiladi va tartibi muhim:
 * JwtAuthGuard -> RolesGuard -> PermissionsGuard.
 *
 * Standart holat — himoyalangan. Ochiq endpoint uchun `@Public()` kerak,
 * ya'ni himoyani unutib qo'yish emas, ochishni unutib qo'yish mumkin —
 * bu esa ancha xavfsiz xato.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    RefreshTokenStore,
    LoginAttemptService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, TokenService, PasswordService, RefreshTokenStore],
})
export class AuthModule {}
