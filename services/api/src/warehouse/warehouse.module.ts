import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  // S31 zaxiralari shu servisni ishlatadi.
  exports: [WarehouseService],
})
export class WarehouseModule {}
