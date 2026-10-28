import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type InvoiceStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealersService } from '../dealers/dealers.service';
import { InvoiceListQueryDto, PaymentListQueryDto } from './dto/billing.dto';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';

/**
 * Diler moliyasi (CLAUDE.md §5).
 *
 * `dealerId` SO'ROVDA YO'Q — sessiyadan olinadi. Begona hujjat
 * `404` beradi, `403` EMAS: ikkinchisi boshqa dilerlarning
 * hujjat id larini tekshirish vositasiga aylanardi.
 *
 * QORALAMA HISOB-FAKTURA KO'RSATILMAYDI — u hali berilmagan.
 */
@ApiTags('diler: moliya')
@Controller('dealer')
@Roles('DEALER')
export class BillingDealerController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly dealers: DealersService,
  ) {}

  @Get('invoices')
  @ApiOperation({ summary: "O'z hisob-fakturalari" })
  @ApiZodQuery(InvoiceListQueryDto)
  async listInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: InvoiceListQueryDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.invoices.listForDealer(dealer.id, {
      page: query.page,
      limit: query.limit,
      status: query.status as InvoiceStatus | undefined,
      openOnly: query.openOnly,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Hisob-faktura tafsiloti' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  async findInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.invoices.findForDealer(dealer.id, id);
  }

  @Get('payments')
  @ApiOperation({ summary: "O'z to'lovlari" })
  @ApiZodQuery(PaymentListQueryDto)
  async listPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentListQueryDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.payments.listForDealer(dealer.id, { page: query.page, limit: query.limit });
  }

  @Get('balance')
  @ApiOperation({ summary: "O'z balansi" })
  async balance(@CurrentUser() user: AuthenticatedUser) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.payments.balance(dealer.id);
  }
}
