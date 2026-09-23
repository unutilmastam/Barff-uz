import { Controller, Get, NotFoundException, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EtagInterceptor } from '../public/etag.interceptor';
import { ContentService } from './content.service';
import { ContentListQueryDto } from './dto/content.dto';

/**
 * Ommaviy kontent endpoint'lari.
 *
 * HAMMASI faqat nashr qilingan yozuvlarni qaytaradi — shart servisdagi
 * yagona filtrdan keladi, bu yerda takrorlanmaydi.
 */
@ApiTags('content')
@Controller()
@Public()
// ETag va `Cache-Control` — javob o'zgarmagan bo'lsa brauzer va CDN
// `304` oladi va tana umuman yuborilmaydi.
@UseInterceptors(EtagInterceptor)
export class PublicContentController {
  constructor(private readonly content: ContentService) {}

  @Get('news')
  @ApiOperation({ summary: "Yangiliklar ro'yxati" })
  @ApiZodQuery(ContentListQueryDto)
  listNews(@Query() query: ContentListQueryDto) {
    return this.content.listNewsPublic(query);
  }

  @Get('news/:slug')
  @ApiOperation({ summary: 'Yangilik matni' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findNews(@Param('slug') slug: string) {
    return this.content.findNewsBySlugPublic(slug);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Sertifikatlar' })
  listCertificates() {
    return this.content.listCertificatesPublic();
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Galereya' })
  @ApiQuery({ name: 'album', required: false })
  listGallery(@Query('album') album?: string) {
    return this.content.listGalleryPublic(album);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Ommaviy hujjatlar' })
  listDocuments() {
    return this.content.listDocumentsPublic();
  }

  @Get('production-steps')
  @ApiOperation({ summary: 'Ishlab chiqarish bosqichlari' })
  listProductionSteps() {
    return this.content.listProductionStepsPublic();
  }

  @Get('homepage-sections')
  @ApiOperation({ summary: "Bosh sahifa bo'limlari" })
  listHomepageSections() {
    return this.content.listHomepageSectionsPublic();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Ommaviy sozlamalar (kontakt va h.k.)' })
  listSettings() {
    return this.content.listPublicSettings();
  }

  @Get('seo')
  @ApiOperation({ summary: "Sahifa SEO ma'lumoti" })
  @ApiQuery({ name: 'path', required: true, example: '/products' })
  async findSeo(@Query('path') path: string) {
    const meta = await this.content.findSeo(path);
    if (meta === null) {
      throw new NotFoundException({ message: "SEO ma'lumoti topilmadi", code: 'SEO_NOT_FOUND' });
    }
    return meta;
  }
}
