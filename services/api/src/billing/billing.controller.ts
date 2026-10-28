import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type InvoiceStatus, type PaymentMethod } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  CreditLimitDto,
  InvoiceCancelDto,
  InvoiceCreateDto,
  InvoiceListQueryDto,
  InvoiceUpdateDto,
  PaymentAllocateDto,
  PaymentCreateDto,
  PaymentListQueryDto,
} from './dto/billing.dto';
import { BillingExportService } from './billing-export.service';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';

/**
 * Moliya: hisob-faktura, to'lov, balans (CLAUDE.md §10, §11).
 *
 * Siyosat: `docs/BILLING-POLICY.md`.
 *
 * DILER UCHUN ALOHIDA KONTROLLER (`billing.dealer.controller.ts`):
 * u yerda `dealerId` SO'ROVDAN OLINMAYDI, sessiyadan topiladi.
 */
@ApiTags('moliya')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly exports: BillingExportService,
  ) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  // ===========================================================================
  // HISOB-FAKTURA
  // ===========================================================================

  @Get('invoices')
  @Permissions('invoices.view')
  @ApiOperation({ summary: 'Hisob-fakturalar' })
  @ApiZodQuery(InvoiceListQueryDto)
  listInvoices(@Query() query: InvoiceListQueryDto) {
    return this.invoices.list({
      page: query.page,
      limit: query.limit,
      status: query.status as InvoiceStatus | undefined,
      dealerId: query.dealerId,
      search: query.search,
      openOnly: query.openOnly,
      overdueOnly: query.overdueOnly,
    });
  }

  @Post('invoices')
  @Permissions('invoices.manage')
  @ApiOperation({ summary: 'Buyurtmadan hisob-faktura yaratish' })
  @ApiZodBody(InvoiceCreateDto)
  @ApiResponse({
    status: 409,
    type: ApiErrorDto,
    description: 'Buyurtma yetkazilmagan yoki hujjat bor',
  })
  createInvoice(
    @Body() dto: InvoiceCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.invoices.createFromOrder(
      dto,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Get('invoices/:id')
  @Permissions('invoices.view')
  @ApiOperation({ summary: 'Hisob-faktura tafsiloti' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.findOne(id);
  }

  @Patch('invoices/:id')
  @Permissions('invoices.manage')
  @ApiOperation({ summary: 'Muddat va ichki izoh' })
  @ApiZodBody(InvoiceUpdateDto)
  updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvoiceUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.invoices.update(id, dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Post('invoices/:id/issue')
  @Permissions('invoices.manage')
  @ApiOperation({ summary: 'Hisob-fakturani BERISH (summalar muzlaydi)' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  issueInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.invoices.issue(id, { id: user.id, email: user.email }, this.context(request));
  }

  @Post('invoices/:id/cancel')
  @Permissions('invoices.manage')
  @ApiOperation({ summary: 'Bekor qilish (sabab SHART)' })
  @ApiZodBody(InvoiceCancelDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Taqsimlangan to'lovi bor" })
  cancelInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvoiceCancelDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.invoices.cancel(
      id,
      dto.reason,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  // ===========================================================================
  // TO'LOV
  // ===========================================================================

  @Get('payments')
  @Permissions('payments.view')
  @ApiOperation({ summary: "To'lovlar" })
  @ApiZodQuery(PaymentListQueryDto)
  listPayments(@Query() query: PaymentListQueryDto) {
    return this.payments.list({
      page: query.page,
      limit: query.limit,
      dealerId: query.dealerId,
      method: query.method as PaymentMethod | undefined,
      search: query.search,
    });
  }

  @Post('payments')
  @Permissions('payments.manage')
  @ApiOperation({ summary: "To'lovni yozish va taqsimlash" })
  @ApiZodBody(PaymentCreateDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "Taqsimot noto'g'ri" })
  recordPayment(
    @Body() dto: PaymentCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.payments.record(
      {
        dealerId: dto.dealerId,
        amount: dto.amount,
        method: dto.method as PaymentMethod,
        receivedAt: dto.receivedAt,
        reference: dto.reference,
        note: dto.note,
        allocations: dto.allocations,
      },
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Get('payments/:id')
  @Permissions('payments.view')
  @ApiOperation({ summary: "To'lov tafsiloti" })
  findPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  @Put('payments/:id/allocations')
  @Permissions('payments.manage')
  @ApiOperation({ summary: "To'lovni QAYTA taqsimlash (eskisi almashtiriladi)" })
  @ApiZodBody(PaymentAllocateDto)
  allocatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentAllocateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.payments.allocate(
      id,
      dto.allocations,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  // ===========================================================================
  // EKSPORT
  // ===========================================================================

  /*
    CSV, PDF EMAS.

    Rasmiy hisob-faktura shakli BARFF dan kelmagan (Q17) va uni
    o'ylab topish soliq hujjatini soxtalashtirish bo'lardi. CSV
    esa shakl DA'VO QILMAYDI — u raqamlar ro'yxati
    (`docs/BILLING-POLICY.md` §0).
  */
  @Get('exports/invoices.csv')
  @Permissions('reports.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="hisob-fakturalar.csv"')
  @ApiOperation({ summary: 'Hisob-fakturalar CSV (summalar TIYINDA)' })
  invoicesCsv(@Query('from') from?: string, @Query('to') to?: string) {
    return this.exports.invoicesCsv({
      ...(from !== undefined ? { from: new Date(from) } : {}),
      ...(to !== undefined ? { to: new Date(to) } : {}),
    });
  }

  @Get('exports/payments.csv')
  @Permissions('reports.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tolovlar.csv"')
  @ApiOperation({ summary: "To'lovlar CSV (summalar TIYINDA)" })
  paymentsCsv(@Query('from') from?: string, @Query('to') to?: string) {
    return this.exports.paymentsCsv({
      ...(from !== undefined ? { from: new Date(from) } : {}),
      ...(to !== undefined ? { to: new Date(to) } : {}),
    });
  }

  // ===========================================================================
  // BALANS VA KREDIT LIMITI
  // ===========================================================================

  @Get('dealers/:id/balance')
  @Permissions('payments.view')
  @ApiOperation({ summary: 'Diler balansi (HISOBLANADI, saqlanmaydi)' })
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.balance(id);
  }

  @Put('dealers/:id/credit-limit')
  @Permissions('dealers.manage')
  @ApiOperation({ summary: 'Kredit limiti (`null` — limitni olib tashlaydi)' })
  @ApiZodBody(CreditLimitDto)
  creditLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreditLimitDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.payments.setCreditLimit(
      id,
      dto.creditLimit,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }
}
