import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type StockMovementType } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { WarehouseService } from './warehouse.service';
import {
  LowStockThresholdDto,
  MovementListQueryDto,
  StockListQueryDto,
  StockMovementDto,
  StockTransferDto,
  WarehouseDto,
  WarehouseUpdateDto,
} from './dto/warehouse.dto';

/**
 * Ombor endpoint'lari (CLAUDE.md §7, §11).
 *
 * RUXSATLAR AJRATILGAN:
 * - `warehouse.view` — ko'rish (omborchi, sotuvchi, admin).
 * - `warehouse.manage` — ombor kartochkasi va ko'chirish.
 * - `stock.adjust` — TUZATISH. Bu alohida vakolat: qoldiqni
 *   "shunchaki to'g'rilash" — inventarizatsiya qarori va u
 *   sababsiz bajarilmaydi.
 */
@ApiTags('warehouse')
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  // ---------------------------------------------------------------- omborlar

  @Get('warehouses')
  @Permissions('warehouse.view')
  @ApiOperation({ summary: "Omborlar ro'yxati" })
  listWarehouses(@Query('includeInactive') includeInactive?: string) {
    return this.warehouse.listWarehouses(includeInactive === 'true');
  }

  @Post('warehouses')
  @Permissions('warehouse.manage')
  @ApiOperation({ summary: 'Ombor qo‘shish' })
  @ApiZodBody(WarehouseDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'Kod band' })
  createWarehouse(
    @Body() dto: WarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.createWarehouse(
      dto,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Patch('warehouses/:id')
  @Permissions('warehouse.manage')
  @ApiOperation({ summary: 'Omborni tahrirlash' })
  @ApiZodBody(WarehouseUpdateDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  updateWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WarehouseUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.updateWarehouse(
      id,
      dto,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  // ------------------------------------------------------------------ qoldiq

  @Get('stock')
  @Permissions('warehouse.view')
  @ApiOperation({ summary: 'Qoldiqlar' })
  @ApiZodQuery(StockListQueryDto)
  listStock(@Query() query: StockListQueryDto) {
    return this.warehouse.listStock(query);
  }

  @Put('stock/:warehouseId/:productVariantId/threshold')
  @Permissions('warehouse.manage')
  @ApiOperation({ summary: 'Kam qoldiq chegarasi' })
  @ApiZodBody(LowStockThresholdDto)
  setThreshold(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Param('productVariantId', ParseUUIDPipe) productVariantId: string,
    @Body() dto: LowStockThresholdDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.setLowStockThreshold(
      warehouseId,
      productVariantId,
      dto.lowStockThreshold,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  // --------------------------------------------------------------- harakatlar

  @Get('movements')
  @Permissions('warehouse.view')
  @ApiOperation({ summary: 'Harakatlar jurnali' })
  @ApiZodQuery(MovementListQueryDto)
  listMovements(@Query() query: MovementListQueryDto) {
    return this.warehouse.listMovements({
      page: query.page,
      limit: query.limit,
      warehouseId: query.warehouseId,
      productVariantId: query.productVariantId,
      type: query.type as StockMovementType | undefined,
      from: query.from,
      to: query.to,
    });
  }

  /**
   * Qo'lda harakat.
   *
   * `ADJUSTMENT` uchun `stock.adjust` ruxsati kerak, qolganlari
   * `warehouse.manage` bilan. Ikkalasini bitta endpoint'da ajratish
   * mumkin emas, shuning uchun TUZATISH ALOHIDA endpoint'da.
   */
  @Post('movements')
  @Permissions('warehouse.manage')
  @ApiOperation({ summary: 'Kelim, chiqim yoki qaytim' })
  @ApiZodBody(StockMovementDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Qoldiq yetarli emas' })
  recordMovement(
    @Body() dto: StockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.recordMovement(
      { ...dto, type: dto.type as 'IN' | 'OUT' | 'RETURN' },
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Post('adjustments')
  @Permissions('stock.adjust')
  @ApiOperation({ summary: 'Inventarizatsiya tuzatishi (sabab SHART)' })
  @ApiZodBody(StockMovementDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Sabab yo‘q yoki qoldiq yetmaydi' })
  adjust(
    @Body() dto: StockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.recordMovement(
      { ...dto, type: 'ADJUSTMENT' },
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Post('transfers')
  @Permissions('warehouse.manage')
  @ApiOperation({ summary: 'Omborlar orasida ko‘chirish' })
  @ApiZodBody(StockTransferDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Qoldiq yetarli emas' })
  transfer(
    @Body() dto: StockTransferDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.warehouse.transfer(dto, { id: user.id, email: user.email }, this.context(request));
  }
}
