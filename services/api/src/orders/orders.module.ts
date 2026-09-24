import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { DealersModule } from '../dealers/dealers.module';
import { AdminOrdersController } from './admin-orders.controller';
import { DealerOrdersController } from './dealer-orders.controller';
import { OrderNumberService } from './order-number.service';
import { OrdersService } from './orders.service';

@Module({
  // `CartService` — buyurtma savatdan quriladi va shu yerda
  // bo'shatiladi; `DealersService` — `dealerId` sessiyadan.
  imports: [CartModule, DealersModule],
  controllers: [DealerOrdersController, AdminOrdersController],
  providers: [OrdersService, OrderNumberService],
  exports: [OrdersService],
})
export class OrdersModule {}
