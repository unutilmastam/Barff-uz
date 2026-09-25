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
import { type DeliveryStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { DeliveryService } from './delivery.service';
import { FleetService } from './fleet.service';
import {
  DeliveryAssignDto,
  DeliveryListQueryDto,
  DeliveryNoteDto,
  DeliveryStatusDto,
  DriverDto,
  DriverUpdateDto,
  VehicleDto,
  VehicleUpdateDto,
} from './dto/delivery.dto';

/**
 * Yetkazib berish (CLAUDE.md §6, §11).
 *
 * IKKI XIL KIRISH:
 *
 * - **Logist** (`delivery.view`, `delivery.assign`,
 *   `delivery.manage`) — hamma yetkazmani ko'radi va yuritadi.
 * - **Haydovchi** (`delivery.view.own`) — FAQAT o'ziga
 *   biriktirilganini. Uning marshrutlari `/delivery/my/...` da va
 *   ularda `driverId` SO'ROVDAN OLINMAYDI — u tokendan topiladi.
 *
 * Siyosat: `docs/DELIVERY-POLICY.md`.
 */
@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly delivery: DeliveryService,
    private readonly fleet: FleetService,
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
  // HAYDOVCHI — STATIK MARSHRUTLAR `:id` DAN OLDIN
  // ===========================================================================

  /**
   * Haydovchining bugungi ishi.
   *
   * `/my/...` prefiksi ATAYLAB: `:id` marshruti `my` so'zini ham
   * qabul qilardi va autentifikatsiya validatsiyadan oldin
   * ishlagani uchun xato JIM qolardi (S28 da o'lchab topilgan
   * tuzoq).
   */
  @Get('my/assignments')
  @Permissions('delivery.view.own')
  @ApiOperation({ summary: 'Mening yetkazmalarim' })
  myAssignments(@CurrentUser() user: AuthenticatedUser, @Query('all') all?: string) {
    return this.delivery.myAssignments(user.id, all !== 'true');
  }

  @Get('my/:id')
  @Permissions('delivery.view.own')
  @ApiOperation({ summary: 'Mening yetkazmam' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi yoki sizga emas' })
  myDelivery(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.findOneForDriver(user.id, id);
  }

  /**
   * Haydovchi holatni o'zgartiradi.
   *
   * `asDriver` uzatiladi va servis IKKI narsani toraytiradi:
   * boshqa yetkazma `404` beradi, biriktirish/bekor qilish esa
   * `403` (`docs/DELIVERY-POLICY.md` §5).
   */
  @Patch('my/:id/status')
  @Permissions('delivery.status.change')
  @ApiOperation({ summary: 'Yetkazma holatini o‘zgartirish (haydovchi)' })
  @ApiZodBody(DeliveryStatusDto)
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Logist vakolati' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  myStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliveryStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.delivery.setStatus(
      id,
      dto.status as DeliveryStatus,
      { id: user.id, email: user.email },
      this.context(request),
      {
        note: dto.note,
        failureReason: dto.failureReason,
        receivedBy: dto.receivedBy,
        proofNote: dto.proofNote,
        asDriver: user.id,
      },
    );
  }

  // ===========================================================================
  // PARK
  // ===========================================================================

  @Get('vehicles')
  @Permissions('delivery.view')
  @ApiOperation({ summary: 'Mashinalar' })
  listVehicles(@Query('includeInactive') includeInactive?: string) {
    return this.fleet.listVehicles(includeInactive === 'true');
  }

  @Post('vehicles')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Mashina qo‘shish' })
  @ApiZodBody(VehicleDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'Davlat raqami band' })
  createVehicle(
    @Body() dto: VehicleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.fleet.createVehicle(dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Patch('vehicles/:id')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Mashinani tahrirlash' })
  @ApiZodBody(VehicleUpdateDto)
  updateVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VehicleUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.fleet.updateVehicle(
      id,
      dto,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Get('drivers')
  @Permissions('delivery.view')
  @ApiOperation({ summary: 'Haydovchilar' })
  listDrivers(@Query('includeInactive') includeInactive?: string) {
    return this.fleet.listDrivers(includeInactive === 'true');
  }

  /** `DRIVER` roli bor, lekin profili yo'q foydalanuvchilar. */
  @Get('drivers/candidates')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Haydovchi bo‘la oladigan foydalanuvchilar' })
  candidates() {
    return this.fleet.candidates();
  }

  @Post('drivers')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Haydovchi profili' })
  @ApiZodBody(DriverDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "HAYDOVCHI roli yo'q" })
  createDriver(
    @Body() dto: DriverDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.fleet.createDriver(dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Patch('drivers/:id')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Haydovchini tahrirlash' })
  @ApiZodBody(DriverUpdateDto)
  updateDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DriverUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.fleet.updateDriver(
      id,
      dto,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  // ===========================================================================
  // LOGIST
  // ===========================================================================

  @Get('assignments')
  @Permissions('delivery.view')
  @ApiOperation({ summary: 'Yetkazmalar ro‘yxati' })
  @ApiZodQuery(DeliveryListQueryDto)
  list(@Query() query: DeliveryListQueryDto) {
    return this.delivery.list({
      page: query.page,
      limit: query.limit,
      status: query.status as DeliveryStatus | undefined,
      driverId: query.driverId,
      region: query.region,
      search: query.search,
      unassigned: query.unassigned,
    });
  }

  @Get(':id')
  @Permissions('delivery.view')
  @ApiOperation({ summary: 'Yetkazma tafsiloti' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.findOne(id);
  }

  @Patch(':id/assign')
  @Permissions('delivery.assign')
  @ApiOperation({ summary: 'Haydovchi biriktirish' })
  @ApiZodBody(DeliveryAssignDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Haydovchi yoki mashina topilmadi' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliveryAssignDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.delivery.assign(id, dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Patch(':id/status')
  @Permissions('delivery.status.change')
  @ApiOperation({ summary: 'Yetkazma holatini o‘zgartirish (logist)' })
  @ApiZodBody(DeliveryStatusDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliveryStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.delivery.setStatus(
      id,
      dto.status as DeliveryStatus,
      { id: user.id, email: user.email },
      this.context(request),
      {
        note: dto.note,
        failureReason: dto.failureReason,
        receivedBy: dto.receivedBy,
        proofNote: dto.proofNote,
      },
    );
  }

  @Put(':id/internal-note')
  @Permissions('delivery.manage')
  @ApiOperation({ summary: 'Ichki izoh (dilerga ko‘rsatilmaydi)' })
  @ApiZodBody(DeliveryNoteDto)
  setNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliveryNoteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.delivery.setInternalNote(
      id,
      dto.internalNote,
      { id: user.id, email: user.email },
      this.context(request),
    );
  }
}
