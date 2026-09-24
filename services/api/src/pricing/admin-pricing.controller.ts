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
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  PriceQuoteDto,
  PriceRuleDto,
  PriceRuleListQueryDto,
  PriceRuleUpdateDto,
} from './dto/pricing.dto';
import { PricingService } from './pricing.service';

/** Narx qoidalari — admin. */
@ApiTags('admin: pricing')
@Controller('admin/price-rules')
export class AdminPricingController {
  constructor(private readonly pricing: PricingService) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  @Get()
  @Permissions('prices.view')
  @ApiOperation({ summary: "Narx qoidalari ro'yxati" })
  @ApiZodQuery(PriceRuleListQueryDto)
  list(@Query() query: PriceRuleListQueryDto) {
    return this.pricing.list({ page: query.page, limit: query.limit });
  }

  /*
    NARXNI OLDINDAN KO'RISH.

    `@Post(':id')` emas, STATIK marshrut — va u `:id` li
    marshrutlardan OLDIN turishi shart (S20 darsi: statik marshrut
    pastda qolsa, Nest uni `:id` deb tushunib `ParseUUIDPipe` bilan
    400 qaytaradi).

    Nega kerak: qoida yozgan xodim uning HAQIQIY ta'sirini saqlashdan
    oldin ko'rishi kerak. Aks holda noto'g'ri chegirma birinchi
    marta MIJOZ buyurtmasida ko'rinardi.
  */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('prices.view')
  @ApiOperation({ summary: 'Berilgan diler uchun narxni oldindan ko‘rish' })
  @ApiZodBody(PriceQuoteDto)
  preview(@Body() dto: PriceQuoteDto, @Query('dealerId') dealerId?: string) {
    return this.pricing.quote(
      dto.lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        ...(dto.promoCode !== undefined ? { promoCode: dto.promoCode } : {}),
      })),
      { dealerId },
    );
  }

  @Post()
  @Permissions('prices.manage')
  @ApiOperation({ summary: 'Narx qoidasi qo‘shish' })
  @ApiZodBody(PriceRuleDto)
  create(
    @Body() dto: PriceRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.pricing.create(dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Patch(':id')
  @Permissions('prices.manage')
  @ApiOperation({ summary: 'Narx qoidasini tahrirlash' })
  @ApiZodBody(PriceRuleUpdateDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PriceRuleUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.pricing.update(id, dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('prices.manage')
  @ApiOperation({ summary: 'Narx qoidasini o‘chirish' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    await this.pricing.remove(id, { id: user.id, email: user.email }, this.context(request));
  }
}
