import { Module } from '@nestjs/common';
import { DealersModule } from '../dealers/dealers.module';
import { PricingModule } from '../pricing/pricing.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { DealerCatalogController } from './dealer-catalog.controller';
import { DealerCatalogService } from './dealer-catalog.service';

@Module({
  // `PricingService` — narx FAQAT o'sha yerda hisoblanadi;
  // `DealersService` — `dealerId` sessiyadan olinadi.
  imports: [PricingModule, DealersModule],
  controllers: [DealerCatalogController, CartController],
  providers: [CartService, DealerCatalogService],
  exports: [CartService],
})
export class CartModule {}
