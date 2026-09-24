import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type DealerStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { DealersService } from './dealers.service';
import { DealerListQueryDto, DealerStatusUpdateDto, DealerTermsUpdateDto } from './dto/dealer.dto';

/** Dilerlarni yuritish: sotuvchi va admin. */
@ApiTags('admin: dealers')
@Controller('admin/dealers')
export class AdminDealersController {
  constructor(private readonly dealers: DealersService) {}

  private context(request: RequestWithUser): RequestContext {
    const userAgent = request.headers['user-agent'];

    return {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };
  }

  @Get()
  @Permissions('dealers.view')
  @ApiOperation({ summary: "Dilerlar ro'yxati" })
  @ApiZodQuery(DealerListQueryDto)
  list(@Query() query: DealerListQueryDto) {
    return this.dealers.list({
      page: query.page,
      limit: query.limit,
      status: query.status as DealerStatus | undefined,
      search: query.search,
    });
  }

  @Get(':id')
  @Permissions('dealers.view')
  @ApiOperation({ summary: 'Diler, manzillari va tarixi' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dealers.findOne(id);
  }

  /**
   * Tasdiqlash, rad etish, to'xtatish.
   *
   * `dealers.approve` — `dealers.manage` dan ALOHIDA ruxsat: dilerni
   * tahrirlash va uni TASDIQLASH bir xil vakolat emas.
   */
  @Patch(':id/status')
  @Permissions('dealers.approve')
  @ApiOperation({ summary: 'Diler holatini o‘zgartirish' })
  @ApiZodBody(DealerStatusUpdateDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "Ruxsat etilmagan o'tish" })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DealerStatusUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.dealers.setStatus(
      id,
      { status: dto.status as DealerStatus, reason: dto.reason, internalNote: dto.internalNote },
      { id: user.id, email: user.email },
      this.context(request),
    );
  }

  @Patch(':id/terms')
  @Permissions('dealers.manage')
  @ApiOperation({ summary: 'Daraja va kredit limiti' })
  @ApiZodBody(DealerTermsUpdateDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Daraja topilmadi' })
  setTerms(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DealerTermsUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.dealers.setTerms(
      id,
      { tierId: dto.tierId, creditLimit: dto.creditLimit, internalNote: dto.internalNote },
      { id: user.id, email: user.email },
      this.context(request),
    );
  }
}
