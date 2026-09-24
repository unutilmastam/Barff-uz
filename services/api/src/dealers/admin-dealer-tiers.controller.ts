import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { DealerTiersService } from './dealer-tiers.service';
import { DealerTierDto, DealerTierUpdateDto } from './dto/dealer.dto';

/** Diler darajalari — narx siyosatining asosi (S23). */
@ApiTags('admin: dealer tiers')
@Controller('admin/dealer-tiers')
export class AdminDealerTiersController {
  constructor(private readonly tiers: DealerTiersService) {}

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
  @ApiOperation({ summary: "Darajalar ro'yxati (nofaollar bilan)" })
  list() {
    return this.tiers.list(true);
  }

  @Post()
  @Permissions('dealers.manage')
  @ApiOperation({ summary: 'Daraja qo‘shish' })
  @ApiZodBody(DealerTierDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'Kod band' })
  create(
    @Body() dto: DealerTierDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.tiers.create(dto, { id: user.id, email: user.email }, this.context(request));
  }

  @Patch(':id')
  @Permissions('dealers.manage')
  @ApiOperation({ summary: 'Darajani tahrirlash' })
  @ApiZodBody(DealerTierUpdateDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DealerTierUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.tiers.update(id, dto, { id: user.id, email: user.email }, this.context(request));
  }
}
