import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { dealerCatalogQuerySchema } from '@barff/validation';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { createZodDto } from '../common/validation/zod-dto';
import { DealersService } from '../dealers/dealers.service';
import { DealerCatalogService } from './dealer-catalog.service';

export class DealerCatalogQueryDto extends createZodDto(dealerCatalogQuerySchema) {}

/**
 * Diler katalogi — DILER NARXI bilan (CLAUDE.md §5).
 *
 * Ommaviy `/products` dan ALOHIDA endpoint. Bitta endpoint'ni
 * "diler bo'lsa boshqa narx" bilan ishlatish xavfli bo'lardi:
 * keshlash qoidasi bitta bo'lib qolardi va diler narxi ommaviy
 * keshga tushib ketishi mumkin edi.
 */
@ApiTags('dealer: katalog')
@Controller('dealer/products')
@Roles('DEALER')
export class DealerCatalogController {
  constructor(
    private readonly catalog: DealerCatalogService,
    private readonly dealers: DealersService,
  ) {}

  /*
    DIQQAT: statik marshrutlar `:slug` dan OLDIN (S20 darsi).
    Bu yerda `:slug` yo'q, lekin qo'shilganda tartib shu bo'lib
    qolishi uchun ular yuqorida turadi.
  */
  @Get('categories')
  @ApiOperation({ summary: 'Filtr uchun kategoriyalar' })
  async categories(@CurrentUser() user: AuthenticatedUser) {
    await this.dealers.requireActiveDealer(user.id);

    return this.catalog.categories();
  }

  @Get('volumes')
  @ApiOperation({ summary: 'Filtr uchun hajmlar' })
  async volumes(@CurrentUser() user: AuthenticatedUser) {
    await this.dealers.requireActiveDealer(user.id);

    return this.catalog.volumes();
  }

  @Get()
  @ApiOperation({ summary: 'Katalog — diler narxlari bilan' })
  @ApiZodQuery(DealerCatalogQueryDto)
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Diler faol emas' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: DealerCatalogQueryDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.catalog.list(dealer.id, {
      page: query.page,
      limit: query.limit,
      categoryId: query.categoryId,
      search: query.search,
      volumeMl: query.volumeMl,
    });
  }
}
