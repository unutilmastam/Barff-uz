import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
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
  controllers: [AdminUsersController],
  providers: [UsersService, UserRolesService, AdminUsersService],
  exports: [UsersService, UserRolesService],
})
export class UsersModule {}
