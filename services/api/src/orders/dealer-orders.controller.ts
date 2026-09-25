import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type OrderStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealersService } from '../dealers/dealers.service';
import { OrderListQueryDto, OrderSubmitDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

/**
 * Diler buyurtmalari (CLAUDE.md §5).
 *
 * `dealerId` SO'ROVDA YO'Q — sessiyadan olinadi. Buyurtma id si
 * begona bo'lsa `404`, "bu sizniki emas" emas: ikkinchisi boshqa
 * dilerlarning buyurtma id larini tekshirish vositasiga aylanardi.
 */
@ApiTags('dealer: buyurtmalar')
@Controller('dealer/orders')
@Roles('DEALER')
export class DealerOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly dealers: DealersService,
  ) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Savatdan buyurtma yuborish' })
  @ApiZodBody(OrderSubmitDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "Savat bo'sh yoki miqdor yetmagan" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Manzil topilmadi' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OrderSubmitDto,
    @Req() request: RequestWithUser,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.orders.submit(
      dealer.id,
      { addressId: dto.addressId, note: dto.note, idempotencyKey: dto.idempotencyKey },
      this.context(request),
    );
  }

  @Get()
  @ApiOperation({ summary: "O'z buyurtmalari" })
  @ApiZodQuery(OrderListQueryDto)
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: OrderListQueryDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.orders.listForDealer(dealer.id, {
      page: query.page,
      limit: query.limit,
      status: query.status as OrderStatus | undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buyurtma, pozitsiyalari va tarixi' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.orders.findForDealer(dealer.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: "Buyurtmani bekor qilish (faqat ko'rib chiqilmagan)" })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'Bekor qilib bo‘lmaydi' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithUser,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.orders.cancelByDealer(
      dealer.id,
      id,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }
}
