import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReservationsService } from './reservations.service';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule],
  controllers: [WarehouseController],
  providers: [WarehouseService, ReservationsService],
  /*
    `ReservationsService` BUYURTMALAR moduliga chiqariladi: zaxira
    holat o'zgarishining YONDOSH TA'SIRI (S31), alohida chaqiruv
    emas. Shunda "zaxiraga olindi" degan holat bilan haqiqiy
    zaxira bir-biridan ajralib keta olmaydi.
  */
  exports: [WarehouseService, ReservationsService],
})
export class WarehouseModule {}
