import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealerAddressesService } from './dealer-addresses.service';
import { DealersService } from './dealers.service';
import { DealerAddressDto, DealerAddressUpdateDto, DealerProfileUpdateDto } from './dto/dealer.dto';

/**
 * Diler kabineti (CLAUDE.md §5).
 *
 * IKKI DARAJALI tekshiruv, va ikkalasi ham SERVERDA:
 *   1. `@Roles('DEALER')` — bu endpoint'lar diler akkauntlari uchun.
 *   2. `requireActiveDealer()` — diler TASDIQLANGAN bo'lishi shart.
 *
 * Ikkinchisi muhimroq: rol arizani yuborgan zahoti beriladi, ya'ni
 * rolning o'zi hech narsani ochmaydi.
 *
 * `dealerId` HECH QACHON so'rovdan olinmaydi — u joriy foydalanuvchi
 * yozuvidan keladi. Aks holda diler boshqa tashkilotning id sini
 * yozib, uning ma'lumotiga yeta olardi.
 */
@ApiTags('dealer: profil')
@Controller('dealer')
@Roles('DEALER')
export class DealerPortalController {
  constructor(
    private readonly dealers: DealersService,
    private readonly addresses: DealerAddressesService,
  ) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  /**
   * O'z profili va ariza holati.
   *
   * Bu endpoint TASDIQLANMAGAN dilerga ham ochiq — aks holda u
   * arizasi qanday ketayotganini umuman ko'ra olmasdi va qo'ng'iroq
   * qilishga majbur bo'lardi.
   */
  @Get('profile')
  @ApiOperation({ summary: "O'z profili va ariza holati" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Diler topilmadi' })
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.dealers.findSelf(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: "O'z profilini tahrirlash" })
  @ApiZodBody(DealerProfileUpdateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'STIR band' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DealerProfileUpdateDto,
    @Req() request: RequestWithUser,
  ) {
    return this.dealers.updateSelf(user.id, dto, this.context(request));
  }

  // ---------------------------------------------------------------------------
  // MANZILLAR — faqat TASDIQLANGAN diler uchun
  // ---------------------------------------------------------------------------

  @Get('addresses')
  @ApiOperation({ summary: 'Yetkazib berish manzillari' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Diler faol emas' })
  async listAddresses(@CurrentUser() user: AuthenticatedUser) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.addresses.list(dealer.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: "Manzil qo'shish" })
  @ApiZodBody(DealerAddressDto)
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Diler faol emas' })
  async createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DealerAddressDto,
    @Req() request: RequestWithUser,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.addresses.create(dealer.id, dto, user.id, this.context(request));
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Manzilni tahrirlash' })
  @ApiZodBody(DealerAddressUpdateDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Manzil topilmadi' })
  async updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DealerAddressUpdateDto,
    @Req() request: RequestWithUser,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.addresses.update(dealer.id, id, dto, user.id, this.context(request));
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Manzilni o'chirish" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Manzil topilmadi' })
  async removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithUser,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    await this.addresses.remove(dealer.id, id, user.id, this.context(request));
  }
}
