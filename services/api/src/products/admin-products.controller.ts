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
import { ApiErrorDto } from '../common/dto/api-error';
import { defined } from '../common/defined';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { PaginationQueryDto } from '../common/dto/pagination';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ProductCreateDto,
  ProductPriceCreateDto,
  ProductUpdateDto,
  ProductVariantCreateDto,
  ProductVariantUpdateDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

/**
 * Admin endpoint'lari.
 *
 * Har biri `products.manage` ruxsatini talab qiladi. Ko'rish uchun
 * `products.view` yetarli — sotuvchi mahsulotlarni ko'ra oladi, lekin
 * o'zgartira olmaydi.
 */
@ApiTags('admin: products')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Permissions('products.view')
  @ApiOperation({ summary: "Mahsulotlar ro'yxati (faol bo'lmaganlar ham)" })
  @ApiZodQuery(PaginationQueryDto)
  list(@Query() query: PaginationQueryDto) {
    return this.products.listAdmin(query);
  }

  @Get(':id')
  @Permissions('products.view')
  @ApiOperation({ summary: "Mahsulot ma'lumotlari" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findByIdAdmin(id);
  }

  @Post()
  @Permissions('products.manage')
  @ApiOperation({ summary: 'Mahsulot yaratish' })
  @ApiZodBody(ProductCreateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'slug yoki sku band' })
  create(
    @Body() dto: ProductCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.products.create(toPrismaProduct(dto), actor(user), context(req));
  }

  @Patch(':id')
  @Permissions('products.manage')
  @ApiOperation({ summary: "Mahsulotni o'zgartirish" })
  @ApiZodBody(ProductUpdateDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.products.update(id, toPrismaProduct(dto), actor(user), context(req));
  }

  @Delete(':id')
  @Permissions('products.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mahsulotni o'chirish (yumshoq)" })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.products.softDelete(id, actor(user), context(req));
  }

  @Post(':id/variants')
  @Permissions('products.manage')
  @ApiOperation({ summary: 'Variant qo‘shish' })
  @ApiZodBody(ProductVariantCreateDto)
  addVariant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductVariantCreateDto) {
    return this.products.addVariant(id, defined(dto));
  }

  @Patch('variants/:variantId')
  @Permissions('products.manage')
  @ApiOperation({ summary: "Variantni o'zgartirish" })
  @ApiZodBody(ProductVariantUpdateDto)
  updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: ProductVariantUpdateDto,
  ) {
    return this.products.updateVariant(variantId, defined(dto));
  }

  @Post('variants/:variantId/prices')
  @Permissions('prices.manage')
  @ApiOperation({ summary: "Narx qo'shish (summa tiyinda)" })
  @ApiZodBody(ProductPriceCreateDto)
  addPrice(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: ProductPriceCreateDto,
  ) {
    return this.products.addPrice(variantId, defined(dto));
  }
}

/**
 * Zod natijasini Prisma kutgan shaklga keltiradi.
 *
 * Ko'p tilli maydonlar JSON ustunlarga tushadi, shuning uchun ular
 * `Prisma.InputJsonValue` sifatida uzatiladi.
 */
function toPrismaProduct(
  // `ProductUpdateDto` — to'liq sxemaning qisman varianti, shuning uchun
  // yaratish DTO'si ham unga mos keladi va bitta mapper ikkalasiga yetadi.
  dto: ProductUpdateDto,
): Prisma.ProductUncheckedCreateInput & Prisma.ProductUncheckedUpdateInput {
  const { name, description, ingredients, storage, flavor, nutrition, seo, ...rest } = dto;

  return defined({
    ...rest,
    ...(name !== undefined ? { name: name as Prisma.InputJsonValue } : {}),
    ...(description !== undefined ? { description: description as Prisma.InputJsonValue } : {}),
    ...(ingredients !== undefined ? { ingredients: ingredients as Prisma.InputJsonValue } : {}),
    ...(storage !== undefined ? { storage: storage as Prisma.InputJsonValue } : {}),
    ...(flavor !== undefined ? { flavor: flavor as Prisma.InputJsonValue } : {}),
    ...(nutrition !== undefined ? { nutrition: nutrition as Prisma.InputJsonValue } : {}),
    ...(seo !== undefined ? { seo: seo as Prisma.InputJsonValue } : {}),
  }) as Prisma.ProductUncheckedCreateInput & Prisma.ProductUncheckedUpdateInput;
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
