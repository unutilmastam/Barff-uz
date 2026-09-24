import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDealerTiersController } from './admin-dealer-tiers.controller';
import { AdminDealersController } from './admin-dealers.controller';
import { DealerAddressesService } from './dealer-addresses.service';
import { DealerPortalController } from './dealer-portal.controller';
import { DealerRegistrationController } from './dealer-registration.controller';
import { DealerTiersService } from './dealer-tiers.service';
import { DealersService } from './dealers.service';

@Module({
  // `PasswordService` — ro'yxatdan o'tishda parol hash'i uchun.
  imports: [AuthModule],
  controllers: [
    DealerRegistrationController,
    DealerPortalController,
    AdminDealersController,
    AdminDealerTiersController,
  ],
  providers: [DealersService, DealerAddressesService, DealerTiersService],
  exports: [DealersService],
})
export class DealersModule {}
