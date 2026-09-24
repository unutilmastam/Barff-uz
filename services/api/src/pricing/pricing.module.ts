import { Module } from '@nestjs/common';
import { DealersModule } from '../dealers/dealers.module';
import { AdminPricingController } from './admin-pricing.controller';
import { DealerPricingController } from './dealer-pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  // `DealersService.requireActiveDealer()` — diler o'z narxini
  // so'raganda `dealerId` so'rovdan emas, sessiyadan olinadi.
  imports: [DealersModule],
  controllers: [DealerPricingController, AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
