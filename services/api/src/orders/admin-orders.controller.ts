import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type OrderStatus, type Prisma } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { OrderListQueryDto, OrderStatusUpdateDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

/** Buyurtmalarni yuritish: sotuvchi, ombor, admin. */
@ApiTags('admin: orders')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  @Get()
  @Permissions('orders.view')
  @ApiOperation({ summary: "Buyurtmalar ro'yxati" })
  @ApiZodQuery(OrderListQueryDto)
  async list(@Query() query: OrderListQueryDto) {
    const request = toPageRequest(query);

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status as OrderStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        include: {
          dealer: { select: { id: true, companyName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  @Get(':id')
  @Permissions('orders.view')
  @ApiOperation({ summary: 'Buyurtma, pozitsiyalari va tarixi' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        dealer: { select: { id: true, companyName: true } },
        items: { orderBy: { createdAt: 'asc' } },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (order === null) {
      throw new NotFoundException({ message: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' });
    }

    return order;
  }

  /**
   * Holatni o'zgartirish.
   *
   * Ruxsat etilmagan o'tish `409` beradi — `400` emas: so'rov
   * TO'G'RI, lekin resursning JORIY HOLATI unga yo'l qo'ymaydi
   * (`ROADMAP.md` S26 DoD).
   */
  @Patch(':id/status')
  @Permissions('orders.manage')
  @ApiOperation({ summary: 'Buyurtma holatini o‘zgartirish' })
  @ApiZodBody(OrderStatusUpdateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  async setStatus(
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
}
