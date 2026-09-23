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
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Prisma } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { defined } from '../common/defined';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ContentService } from './content.service';
import {
  AdminContentListQueryDto,
  CertificateCreateDto,
  CertificateUpdateDto,
  GalleryItemCreateDto,
  GalleryItemUpdateDto,
  HomepageSectionUpsertDto,
  NewsCreateDto,
  NewsUpdateDto,
  ProductionStepUpsertDto,
  PublicDocumentCreateDto,
  PublicDocumentUpdateDto,
  SeoMetadataUpsertDto,
  SystemSettingUpsertDto,
} from './dto/content.dto';

/**
 * Kontent boshqaruvi.
 *
 * Ko'rish uchun `content.view`, o'zgartirish uchun `content.manage`.
 * Yangi yozuv standart holatda `DRAFT` bo'ladi — nashr qilish alohida
 * qaror.
 */
@ApiTags('admin: content')
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  // --- Yangiliklar ------------------------------------------------------------

  @Get('news')
  @Permissions('content.view')
  @ApiOperation({ summary: 'Yangiliklar (qoralamalar ham)' })
  @ApiZodQuery(AdminContentListQueryDto)
  listNews(@Query() query: AdminContentListQueryDto) {
    return this.content.listNewsAdmin(query);
  }

  @Get('news/:id')
  @Permissions('content.view')
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findNews(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.findNewsAdmin(id);
  }

  @Post('news')
  @Permissions('content.manage')
  @ApiOperation({ summary: 'Yangilik yaratish' })
  @ApiZodBody(NewsCreateDto)
  createNews(
    @Body() dto: NewsCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.content.createNews(
      { ...toJson(dto), authorId: user.id } as Prisma.NewsArticleUncheckedCreateInput,
      actor(user),
      context(req),
    );
  }

  @Patch('news/:id')
  @Permissions('content.manage')
  @ApiZodBody(NewsUpdateDto)
  updateNews(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NewsUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.content.updateNews(
      id,
      toJson(dto) as Prisma.NewsArticleUncheckedUpdateInput,
      actor(user),
      context(req),
    );
  }

  @Delete('news/:id')
  @Permissions('content.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNews(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.content.deleteNews(id, actor(user), context(req));
  }

  // --- Sertifikatlar ----------------------------------------------------------

  @Get('certificates')
  @Permissions('content.view')
  listCertificates() {
    return this.content.listCertificatesAdmin();
  }

  @Post('certificates')
  @Permissions('content.manage')
  @ApiZodBody(CertificateCreateDto)
  createCertificate(@Body() dto: CertificateCreateDto) {
    return this.content.createCertificate(toJson(dto) as Prisma.CertificateUncheckedCreateInput);
  }

  @Patch('certificates/:id')
  @Permissions('content.manage')
  @ApiZodBody(CertificateUpdateDto)
  updateCertificate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CertificateUpdateDto) {
    return this.content.updateCertificate(
      id,
      toJson(dto) as Prisma.CertificateUncheckedUpdateInput,
    );
  }

  @Delete('certificates/:id')
  @Permissions('content.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCertificate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.content.deleteCertificate(id);
  }

  // --- Galereya ---------------------------------------------------------------

  @Get('gallery')
  @Permissions('content.view')
  listGallery() {
    return this.content.listGalleryAdmin();
  }

  @Post('gallery')
  @Permissions('content.manage')
  @ApiZodBody(GalleryItemCreateDto)
  createGalleryItem(@Body() dto: GalleryItemCreateDto) {
    return this.content.createGalleryItem(toJson(dto) as Prisma.GalleryItemUncheckedCreateInput);
  }

  @Patch('gallery/:id')
  @Permissions('content.manage')
  @ApiZodBody(GalleryItemUpdateDto)
  updateGalleryItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GalleryItemUpdateDto) {
    return this.content.updateGalleryItem(
      id,
      toJson(dto) as Prisma.GalleryItemUncheckedUpdateInput,
    );
  }

  @Delete('gallery/:id')
  @Permissions('content.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGalleryItem(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.content.deleteGalleryItem(id);
  }

  // --- Hujjatlar --------------------------------------------------------------

  @Get('documents')
  @Permissions('content.view')
  listDocuments() {
    return this.content.listDocumentsAdmin();
  }

  @Post('documents')
  @Permissions('content.manage')
  @ApiZodBody(PublicDocumentCreateDto)
  createDocument(@Body() dto: PublicDocumentCreateDto) {
    return this.content.createDocument(toJson(dto) as Prisma.PublicDocumentUncheckedCreateInput);
  }

  @Patch('documents/:id')
  @Permissions('content.manage')
  @ApiZodBody(PublicDocumentUpdateDto)
  updateDocument(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublicDocumentUpdateDto) {
    return this.content.updateDocument(
      id,
      toJson(dto) as Prisma.PublicDocumentUncheckedUpdateInput,
    );
  }

  @Delete('documents/:id')
  @Permissions('content.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.content.deleteDocument(id);
  }

  // --- Bosqichlar, bosh sahifa, SEO -------------------------------------------

  @Get('production-steps')
  @Permissions('content.view')
  listProductionSteps() {
    return this.content.listProductionStepsAdmin();
  }

  @Put('production-steps/:slug')
  @Permissions('content.manage')
  @ApiOperation({ summary: 'Bosqichni yaratish yoki yangilash' })
  @ApiZodBody(ProductionStepUpsertDto)
  upsertProductionStep(@Param('slug') slug: string, @Body() dto: ProductionStepUpsertDto) {
    return this.content.upsertProductionStep(
      slug,
      toJson(dto) as Prisma.ProductionStepUncheckedCreateInput,
    );
  }

  @Get('homepage-sections')
  @Permissions('content.view')
  listHomepageSections() {
    return this.content.listHomepageSectionsAdmin();
  }

  @Put('homepage-sections/:key')
  @Permissions('content.manage')
  @ApiZodBody(HomepageSectionUpsertDto)
  upsertHomepageSection(@Param('key') key: string, @Body() dto: HomepageSectionUpsertDto) {
    return this.content.upsertHomepageSection(
      key,
      toJson(dto) as Prisma.HomepageSectionUncheckedCreateInput,
    );
  }

  @Get('seo')
  @Permissions('content.view')
  listSeo() {
    return this.content.listSeoAdmin();
  }

  @Put('seo')
  @Permissions('content.manage')
  @ApiOperation({ summary: "Sahifa SEO ma'lumotini saqlash" })
  @ApiZodBody(SeoMetadataUpsertDto)
  upsertSeo(@Body() dto: SeoMetadataUpsertDto) {
    return this.content.upsertSeo(dto.path, toJson(dto) as Prisma.SeoMetadataUncheckedCreateInput);
  }

  // --- Tizim sozlamalari ------------------------------------------------------

  @Get('settings')
  @Permissions('settings.manage')
  @ApiOperation({ summary: 'Barcha sozlamalar' })
  listSettings() {
    return this.content.listSettingsAdmin();
  }

  @Put('settings')
  @Permissions('settings.manage')
  @ApiOperation({ summary: 'Sozlamani saqlash' })
  @ApiZodBody(SystemSettingUpsertDto)
  upsertSetting(
    @Body() dto: SystemSettingUpsertDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.content.upsertSetting(
      dto.key,
      toJson(dto) as Prisma.SystemSettingUncheckedCreateInput,
      actor(user),
      context(request),
    );
  }
}

/**
 * Ko'p tilli maydonlar JSON ustunlarga tushadi.
 *
 * `defined()` qiymati yo'q kalitlarni olib tashlaydi — Prisma uchun
 * `{ title: undefined }` "o'zgartirma" degani emas.
 */
function toJson<T extends object>(dto: T): Record<string, unknown> {
  return defined(dto) as Record<string, unknown>;
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
