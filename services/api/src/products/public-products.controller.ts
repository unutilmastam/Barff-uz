import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EtagInterceptor } from '../public/etag.interceptor';
import { ProductListQueryDto } from './dto/product.dto';
import { ProductsService } from './products.service';

/**
 * Ommaviy mahsulot endpoint'lari.
 *
 * `@Public()` — autentifikatsiyasiz ochiq. Faqat FAOL va o'chirilmagan
 * mahsulotlar qaytadi; bu shart servisda markazlashtirilgan, shuning
 * uchun bu yerda qo'shimcha filtr yozilmaydi.
 */
@ApiTags('products')
@Controller('products')
@Public()
// ETag va `Cache-Control` — javob o'zgarmagan bo'lsa brauzer va CDN
// `304` oladi va tana umuman yuborilmaydi.
@UseInterceptors(EtagInterceptor)
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "Mahsulotlar ro'yxati (ommaviy)" })
  @ApiZodQuery(ProductListQueryDto)
  list(@Query() query: ProductListQueryDto) {
    return this.products.listPublic(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar (ommaviy)' })
  listCategories() {
    return this.products.listPublicCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: "Mahsulot ma'lumotlari (slug bo'yicha)" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlugPublic(slug);
  }
}
