import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealersService } from '../dealers/dealers.service';
import { PriceQuoteDto } from './dto/pricing.dto';
import { PricingService } from './pricing.service';

/**
 * Diler narxi (CLAUDE.md §5).
 *
 * `POST`, `GET` EMAS — sabab amaliy: savat 200 tagacha pozitsiyadan
 * iborat bo'lishi mumkin va ular URL ga sig'masdi. Amal o'zi
 * ma'lumotni O'ZGARTIRMAYDI.
 *
 * Diler `dealerId` ni YUBORMAYDI — u joriy foydalanuvchidan olinadi.
 * Aks holda diler boshqa tashkilotning (masalan eng katta chegirmali
 * dilerning) id sini yozib, uning narxini ko'ra olardi.
 */
@ApiTags('dealer: narx')
@Controller('dealer/pricing')
@Roles('DEALER')
export class DealerPricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly dealers: DealersService,
  ) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Savat uchun narx hisobi' })
  @ApiZodBody(PriceQuoteDto)
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Diler faol emas' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Variant topilmadi' })
  async quote(@CurrentUser() user: AuthenticatedUser, @Body() dto: PriceQuoteDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    const lines = await this.pricing.quote(
      dto.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        ...(dto.promoCode !== undefined ? { promoCode: dto.promoCode } : {}),
      })),
      { dealerId: dealer.id },
    );

    return {
      lines,
      // Jami summa ham SERVERDA hisoblanadi: frontend uni qayta
      // yig'sa, yaxlitlash farqi paydo bo'lishi mumkin edi.
      total: lines.reduce((sum, line) => sum + line.total, 0),
      currency: lines[0]?.currency ?? 'UZS',
    };
  }
}
