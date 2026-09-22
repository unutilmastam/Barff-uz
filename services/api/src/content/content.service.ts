import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER, type StorageAdapter } from '../media/storage/storage.adapter';
import { CacheService } from '../public/cache/cache.service';
import { toPublicNewsArticle, toPublicNewsSummary } from '../public/public.mappers';
import { PUBLISHED_ONLY, PUBLISHED_WHERE, publishedNewsWhere } from './content.filters';

interface Actor {
  id: string;
  email: string;
}

interface ListQuery {
  page: number;
  limit: number;
  sortOrder?: 'asc' | 'desc' | undefined;
}

const MEDIA_SELECT = {
  select: { id: true, key: true, width: true, height: true, blurDataUrl: true, variants: true },
} as const;

@Injectable()
export class ContentService {
  /**
   * Kesh muddati.
   *
   * Kontent mahsulotlardan ko'ra kamroq o'zgaradi, lekin nashr qilingan
   * yangilik darhol ko'rinishi kerak — shuning uchun muddat qisqa va
   * yozuv o'zgarganda kesh baribir aniq bekor qilinadi.
   */
  private static readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  private readonly url = (key: string): string => this.storage.publicUrl(key);

  /** Kontentning har qanday o'zgarishi ommaviy javoblarga ta'sir qiladi. */
  private invalidate(): Promise<void> {
    return this.cache.invalidate('content');
  }

  // ===========================================================================
  // YANGILIKLAR
  // ===========================================================================

  async listNewsPublic(query: ListQuery) {
    const request = toPageRequest(query);

    return this.cache.wrap(
      'content',
      `news:list:${request.page}:${request.limit}`,
      ContentService.CACHE_TTL_SECONDS,
      () => this.loadNewsList(request),
    );
  }

  private async loadNewsList(request: ReturnType<typeof toPageRequest>) {
    const where = publishedNewsWhere();

    const [items, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        // To'liq matn ro'yxatda kerak emas — u har bir maqolada katta
        // bo'lishi mumkin va javobni bekorga og'irlashtiradi.
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          publishedAt: true,
          coverImage: MEDIA_SELECT,
        },
        orderBy: { publishedAt: 'desc' },
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return paginate(
      items.map((item) => toPublicNewsSummary(item, this.url)),
      total,
      request,
    );
  }

  async findNewsBySlugPublic(slug: string) {
    return this.cache.wrap(
      'content',
      `news:slug:${slug}`,
      ContentService.CACHE_TTL_SECONDS,
      async () => {
        const article = await this.prisma.newsArticle.findFirst({
          where: { slug, ...publishedNewsWhere() },
          include: { coverImage: MEDIA_SELECT },
        });

        if (article === null) {
          throw new NotFoundException({ message: 'Yangilik topilmadi', code: 'NEWS_NOT_FOUND' });
        }

        return toPublicNewsArticle(article, this.url);
      },
    );
  }

  async listNewsAdmin(query: ListQuery & { status?: string | undefined }) {
    const request = toPageRequest(query);
    const where: Prisma.NewsArticleWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status as never } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findNewsAdmin(id: string) {
    const article = await this.prisma.newsArticle.findFirst({ where: { id, deletedAt: null } });
    if (article === null) {
      throw new NotFoundException({ message: 'Yangilik topilmadi', code: 'NEWS_NOT_FOUND' });
    }
    return article;
  }

  async createNews(
    data: Prisma.NewsArticleUncheckedCreateInput,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const article = await this.unique(() => this.prisma.newsArticle.create({ data }));

    // Javob qaytarilishidan OLDIN — keyingi so'rov yangi holatni oladi.
    await this.invalidate();

    await this.audit.record({
      action: AUDIT_ACTIONS.CONTENT_CREATED,
      entity: 'NewsArticle',
      entityId: article.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: { slug: article.slug, status: article.status },
      ...ctx,
    });

    return article;
  }

  async updateNews(
    id: string,
    data: Prisma.NewsArticleUncheckedUpdateInput,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const before = await this.findNewsAdmin(id);
    const article = await this.unique(() =>
      this.prisma.newsArticle.update({ where: { id }, data }),
    );

    await this.invalidate();

    await this.audit.record({
      action: AUDIT_ACTIONS.CONTENT_UPDATED,
      entity: 'NewsArticle',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { status: before.status, slug: before.slug },
      after: { status: article.status, slug: article.slug },
      ...ctx,
    });

    return article;
  }

  async deleteNews(id: string, actor: Actor, ctx: RequestContext) {
    await this.findNewsAdmin(id);
    await this.prisma.newsArticle.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.invalidate();

    await this.audit.record({
      action: AUDIT_ACTIONS.CONTENT_DELETED,
      entity: 'NewsArticle',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      ...ctx,
    });
  }

  // ===========================================================================
  // SERTIFIKATLAR
  // ===========================================================================

  listCertificatesPublic() {
    return this.cache.wrap('content', 'certificates', ContentService.CACHE_TTL_SECONDS, () =>
      this.prisma.certificate.findMany({
        where: PUBLISHED_WHERE,
        orderBy: { displayOrder: 'asc' },
        include: { mediaAsset: { select: { id: true, key: true, mimeType: true } } },
      }),
    );
  }

  listCertificatesAdmin() {
    return this.prisma.certificate.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createCertificate(data: Prisma.CertificateUncheckedCreateInput) {
    const row = await this.prisma.certificate.create({ data });
    await this.invalidate();
    return row;
  }

  async updateCertificate(id: string, data: Prisma.CertificateUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.certificate.findFirst({ where: { id, deletedAt: null } }),
      'Sertifikat',
    );
    const row = await this.prisma.certificate.update({ where: { id }, data });
    await this.invalidate();
    return row;
  }

  async deleteCertificate(id: string) {
    await this.assertExists(
      this.prisma.certificate.findFirst({ where: { id, deletedAt: null } }),
      'Sertifikat',
    );
    await this.prisma.certificate.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.invalidate();
  }

  // ===========================================================================
  // GALEREYA
  // ===========================================================================

  listGalleryPublic(album?: string) {
    return this.cache.wrap(
      'content',
      `gallery:${album ?? '-'}`,
      ContentService.CACHE_TTL_SECONDS,
      () =>
        this.prisma.galleryItem.findMany({
          where: { ...PUBLISHED_WHERE, ...(album !== undefined ? { album } : {}) },
          orderBy: { displayOrder: 'asc' },
          include: { mediaAsset: MEDIA_SELECT },
        }),
    );
  }

  listGalleryAdmin() {
    return this.prisma.galleryItem.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createGalleryItem(data: Prisma.GalleryItemUncheckedCreateInput) {
    const row = await this.prisma.galleryItem.create({ data });
    await this.invalidate();
    return row;
  }

  async updateGalleryItem(id: string, data: Prisma.GalleryItemUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.galleryItem.findFirst({ where: { id, deletedAt: null } }),
      'Galereya elementi',
    );
    const row = await this.prisma.galleryItem.update({ where: { id }, data });
    await this.invalidate();
    return row;
  }

  async deleteGalleryItem(id: string) {
    await this.assertExists(
      this.prisma.galleryItem.findFirst({ where: { id, deletedAt: null } }),
      'Galereya elementi',
    );
    await this.prisma.galleryItem.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.invalidate();
  }

  // ===========================================================================
  // HUJJATLAR
  // ===========================================================================

  listDocumentsPublic() {
    return this.cache.wrap('content', 'documents', ContentService.CACHE_TTL_SECONDS, () =>
      this.prisma.publicDocument.findMany({
        where: PUBLISHED_WHERE,
        orderBy: { displayOrder: 'asc' },
        include: {
          mediaAsset: { select: { id: true, key: true, mimeType: true, byteSize: true } },
        },
      }),
    );
  }

  listDocumentsAdmin() {
    return this.prisma.publicDocument.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createDocument(data: Prisma.PublicDocumentUncheckedCreateInput) {
    const row = await this.prisma.publicDocument.create({ data });
    await this.invalidate();
    return row;
  }

  async updateDocument(id: string, data: Prisma.PublicDocumentUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.publicDocument.findFirst({ where: { id, deletedAt: null } }),
      'Hujjat',
    );
    const row = await this.prisma.publicDocument.update({ where: { id }, data });
    await this.invalidate();
    return row;
  }

  async deleteDocument(id: string) {
    await this.assertExists(
      this.prisma.publicDocument.findFirst({ where: { id, deletedAt: null } }),
      'Hujjat',
    );
    await this.prisma.publicDocument.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.invalidate();
  }

  // ===========================================================================
  // ISHLAB CHIQARISH BOSQICHLARI VA BOSH SAHIFA
  // ===========================================================================

  listProductionStepsPublic() {
    return this.cache.wrap('content', 'steps', ContentService.CACHE_TTL_SECONDS, () =>
      this.prisma.productionStep.findMany({
        where: PUBLISHED_ONLY,
        orderBy: { displayOrder: 'asc' },
        include: { mediaAsset: MEDIA_SELECT },
      }),
    );
  }

  listProductionStepsAdmin() {
    return this.prisma.productionStep.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  /** Bosqichlar ro'yxati qat'iy — shuning uchun yaratish emas, upsert. */
  async upsertProductionStep(slug: string, data: Prisma.ProductionStepUncheckedCreateInput) {
    const row = await this.prisma.productionStep.upsert({
      where: { slug },
      update: data,
      create: { ...data, slug },
    });
    await this.invalidate();
    return row;
  }

  listHomepageSectionsPublic() {
    return this.cache.wrap('content', 'homepage', ContentService.CACHE_TTL_SECONDS, () =>
      this.prisma.homepageSection.findMany({
        where: PUBLISHED_ONLY,
        orderBy: { displayOrder: 'asc' },
        include: { mediaAsset: MEDIA_SELECT },
      }),
    );
  }

  listHomepageSectionsAdmin() {
    return this.prisma.homepageSection.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async upsertHomepageSection(key: string, data: Prisma.HomepageSectionUncheckedCreateInput) {
    const row = await this.prisma.homepageSection.upsert({
      where: { key },
      update: data,
      create: { ...data, key },
    });
    await this.invalidate();
    return row;
  }

  // ===========================================================================
  // SEO
  // ===========================================================================

  findSeo(path: string) {
    return this.cache.wrap('content', `seo:${path}`, ContentService.CACHE_TTL_SECONDS, () =>
      this.prisma.seoMetadata.findUnique({
        where: { path },
        include: { ogImage: { select: { id: true, key: true } } },
      }),
    );
  }

  listSeoAdmin() {
    return this.prisma.seoMetadata.findMany({ orderBy: { path: 'asc' } });
  }

  async upsertSeo(path: string, data: Prisma.SeoMetadataUncheckedCreateInput) {
    const row = await this.prisma.seoMetadata.upsert({
      where: { path },
      update: data,
      create: { ...data, path },
    });
    await this.invalidate();
    return row;
  }

  // ===========================================================================
  // Yordamchilar
  // ===========================================================================

  private async assertExists<T>(query: Promise<T | null>, label: string): Promise<T> {
    const found = await query;
    if (found === null) {
      throw new NotFoundException({ message: `${label} topilmadi`, code: 'CONTENT_NOT_FOUND' });
    }
    return found;
  }

  /** Takroriy `slug`/`key`/`path` uchun tushunarli `409`. */
  private async unique<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.['target'];
        const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'maydon');

        throw new ConflictException({
          message: `Bu qiymat allaqachon band: ${fields}`,
          code: 'DUPLICATE_VALUE',
          details: { [fields]: ['Bu qiymat allaqachon ishlatilgan'] },
        });
      }
      throw error;
    }
  }
}
