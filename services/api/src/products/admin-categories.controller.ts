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
import { type Prisma } from '@barff/db';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { defined } from '../common/defined';
import { ApiErrorDto } from '../common/dto/api-error';
import { PaginationQueryDto } from '../common/dto/pagination';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { ProductCategoryCreateDto, ProductCategoryUpdateDto } from './dto/product.dto';
import { ProductCategoriesService } from './product-categories.service';

/**
 * Kategoriyalar. Ko'rish — `products.view`, o'zgartirish — `products.manage`.
 */
@ApiTags('admin: categories')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @Permissions('products.view')
  @ApiOperation({ summary: "Kategoriyalar ro'yxati (faol bo'lmaganlar ham)" })
  @ApiZodQuery(PaginationQueryDto)
  list(@Query() query: PaginationQueryDto) {
    return this.categories.list(query);
  }

  @Post()
  @Permissions('products.manage')
  @ApiOperation({ summary: 'Kategoriya yaratish' })
  @ApiZodBody(ProductCategoryCreateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'slug band' })
  create(
    @Body() dto: ProductCategoryCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.categories.create(toPrisma(dto), actor(user), context(req));
  }

  @Patch(':id')
  @Permissions('products.manage')
  @ApiOperation({ summary: "Kategoriyani o'zgartirish" })
  @ApiZodBody(ProductCategoryUpdateDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductCategoryUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.categories.update(id, toPrisma(dto), actor(user), context(req));
  }

  @Delete(':id')
  @Permissions('products.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Kategoriyani o'chirish (yumshoq; bo'sh bo'lsa)" })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: "Kategoriya bo'sh emas" })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.categories.softDelete(id, actor(user), context(req));
  }
}

function toPrisma(
  dto: ProductCategoryUpdateDto,
): Prisma.ProductCategoryUncheckedCreateInput & Prisma.ProductCategoryUncheckedUpdateInput {
  const { name, description, seo, ...rest } = dto;

  return defined({
    ...rest,
    ...(name !== undefined ? { name: name as Prisma.InputJsonValue } : {}),
    ...(description !== undefined ? { description: description as Prisma.InputJsonValue } : {}),
    ...(seo !== undefined ? { seo: seo as Prisma.InputJsonValue } : {}),
  }) as Prisma.ProductCategoryUncheckedCreateInput & Prisma.ProductCategoryUncheckedUpdateInput;
}

function actor(user: AuthenticatedUser): { id: string; email: string } {
  return { id: user.id, email: user.email };
}

function context(req: RequestWithUser): RequestContext {
  const userAgent = req.headers['user-agent'];

  return {
    ip: req.ip ?? 'unknown',
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
    ...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
  };
}
