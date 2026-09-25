import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type OrderStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderQueryDto, OrderInternalNoteDto, OrderStatusUpdateDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

/**
 * Buyurtmalarni yuritish: sotuvchi, ombor, logist, admin (CLAUDE.md §8).
 *
 * RUXSATLAR ROL EMAS, AMALGA qarab beriladi:
 *   - `orders.view` — ko'rish (SALES, WAREHOUSE, LOGISTICS, ADMIN);
 *   - `orders.status.change` — holatni o'zgartirish (WAREHOUSE, ADMIN);
 *   - `orders.manage` — ichki izoh va boshqa yuritish amallari (ADMIN).
 *
 * DIQQAT — S26 DA XATO BOR EDI: holat o'zgartirish `orders.manage`
 * bilan qo'riqlanardi, lekin ruxsat katalogida OMBOR xodimiga
 * `orders.status.change` berilgan. Ya'ni ombor xodimi buyurtmani
 * yig'ishni boshlagach uni "PICKING" ga o'tkaza OLMASDI. Endi
 * endpoint katalogdagi ruxsatga mos.
 */
@ApiTags('admin: orders')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly admin: AdminOrdersService,
  ) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  /*
    STATIK marshrut `:id` dan OLDIN — S20 darsi: pastda qolsa Nest
    uni `:id` deb tushunib `ParseUUIDPipe` bilan 400 qaytaradi.
  */
  @Get('dealers')
  @Permissions('orders.view')
  @ApiOperation({ summary: 'Filtr uchun dilerlar' })
  dealers() {
    return this.admin.dealersWithOrders();
  }

  @Get()
  @Permissions('orders.view')
  @ApiOperation({ summary: "Buyurtmalar ro'yxati (filtrlar bilan)" })
  @ApiZodQuery(AdminOrderQueryDto)
  list(@Query() query: AdminOrderQueryDto) {
    return this.admin.list({
      page: query.page,
      limit: query.limit,
      status: query.status as OrderStatus | undefined,
      dealerId: query.dealerId,
      region: query.region,
      from: query.from,
      to: query.to,
      search: query.search,
    });
  }

  @Get(':id')
  @Permissions('orders.view')
  @ApiOperation({ summary: 'Buyurtma, pozitsiyalari, dileri va tarixi' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.findOne(id);
  }

  /**
   * Holatni o'zgartirish.
   *
   * Ruxsat etilmagan o'tish `409` beradi — `400` emas: so'rov
   * TO'G'RI, lekin resursning JORIY HOLATI unga yo'l qo'ymaydi
   * (`ROADMAP.md` S26 DoD).
   */
  @Patch(':id/status')
  @Permissions('orders.status.change')
  @ApiOperation({ summary: 'Buyurtma holatini o‘zgartirish' })
  @ApiZodBody(OrderStatusUpdateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderStatusUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.orders.setStatus(
      id,
      dto.status as OrderStatus,
      { id: user.id, email: user.email },
      this.context(request),
      dto.note,
    );
  }

  @Put(':id/internal-note')
  @Permissions('orders.manage')
  @ApiOperation({ summary: 'Xodimlar izohi (dilerga ko‘rsatilmaydi)' })
  @ApiZodBody(OrderInternalNoteDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  setInternalNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderInternalNoteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.admin.setInternalNote(
      id,
      dto.internalNote,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }
}
