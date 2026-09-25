import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { DealersModule } from '../dealers/dealers.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { DealerOrdersController } from './dealer-orders.controller';
import { OrderNumberService } from './order-number.service';
import { OrdersService } from './orders.service';

@Module({
  // `CartService` — buyurtma savatdan quriladi va shu yerda
  // bo'shatiladi; `DealersService` — `dealerId` sessiyadan.
  imports: [CartModule, DealersModule, WarehouseModule, DeliveryModule],
  controllers: [DealerOrdersController, AdminOrdersController],
  providers: [OrdersService, OrderNumberService, AdminOrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
