import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserRolesService } from './user-roles.service';
import { UsersService } from './users.service';

/**
 * `AuthModule` bu yerda `RefreshTokenStore` uchun import qilinadi
 * (akkaunt bloklanganda sessiyalarni bekor qilish). Teskari yo'nalishda
 * import yo'q: `AuthModule` `UsersService` ni global modul orqali oladi.
 */
@Global()
@Module({
  imports: [AuthModule],
  providers: [UsersService, UserRolesService],
  exports: [UsersService, UserRolesService],
})
export class UsersModule {}
