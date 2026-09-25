import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryNumberService } from './delivery-number.service';
import { DeliveryService } from './delivery.service';
import { FleetService } from './fleet.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, FleetService, DeliveryNumberService],
  // Buyurtma `READY_FOR_DELIVERY` ga o'tganda yetkazma tug'iladi.
  exports: [DeliveryService],
})
export class DeliveryModule {}
