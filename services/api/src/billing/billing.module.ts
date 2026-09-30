import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DealersModule } from '../dealers/dealers.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingDealerController } from './billing-dealer.controller';
import { BillingExportService } from './billing-export.service';
import { BillingNumberService } from './billing-number.service';
import { BillingController } from './billing.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, AuditModule, DealersModule],
  controllers: [BillingController, BillingDealerController],
  providers: [InvoicesService, PaymentsService, BillingNumberService, BillingExportService],
  // Buyurtma yuborishda kredit limiti tekshiriladi.
  exports: [PaymentsService, InvoicesService],
})
export class BillingModule {}
