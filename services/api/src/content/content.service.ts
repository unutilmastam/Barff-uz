import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ===========================================================================
  // YANGILIKLAR
  // ===========================================================================

  async listNewsPublic(query: ListQuery) {
    const request = toPageRequest(query);
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

    return paginate(items, total, request);
  }

  async findNewsBySlugPublic(slug: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { slug, ...publishedNewsWhere() },
      include: { coverImage: MEDIA_SELECT },
    });

    if (article === null) {
      throw new NotFoundException({ message: 'Yangilik topilmadi', code: 'NEWS_NOT_FOUND' });
    }

    return article;
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
    return this.prisma.certificate.findMany({
      where: PUBLISHED_WHERE,
      orderBy: { displayOrder: 'asc' },
      include: { mediaAsset: { select: { id: true, key: true, mimeType: true } } },
    });
  }

  listCertificatesAdmin() {
    return this.prisma.certificate.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  createCertificate(data: Prisma.CertificateUncheckedCreateInput) {
    return this.prisma.certificate.create({ data });
  }

  async updateCertificate(id: string, data: Prisma.CertificateUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.certificate.findFirst({ where: { id, deletedAt: null } }),
      'Sertifikat',
    );
    return this.prisma.certificate.update({ where: { id }, data });
  }

  async deleteCertificate(id: string) {
    await this.assertExists(
      this.prisma.certificate.findFirst({ where: { id, deletedAt: null } }),
      'Sertifikat',
    );
    await this.prisma.certificate.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ===========================================================================
  // GALEREYA
  // ===========================================================================

  listGalleryPublic(album?: string) {
    return this.prisma.galleryItem.findMany({
      where: { ...PUBLISHED_WHERE, ...(album !== undefined ? { album } : {}) },
      orderBy: { displayOrder: 'asc' },
      include: { mediaAsset: MEDIA_SELECT },
    });
  }

  listGalleryAdmin() {
    return this.prisma.galleryItem.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  createGalleryItem(data: Prisma.GalleryItemUncheckedCreateInput) {
    return this.prisma.galleryItem.create({ data });
  }

  async updateGalleryItem(id: string, data: Prisma.GalleryItemUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.galleryItem.findFirst({ where: { id, deletedAt: null } }),
      'Galereya elementi',
    );
    return this.prisma.galleryItem.update({ where: { id }, data });
  }

  async deleteGalleryItem(id: string) {
    await this.assertExists(
      this.prisma.galleryItem.findFirst({ where: { id, deletedAt: null } }),
      'Galereya elementi',
    );
    await this.prisma.galleryItem.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ===========================================================================
  // HUJJATLAR
  // ===========================================================================

  listDocumentsPublic() {
    return this.prisma.publicDocument.findMany({
      where: PUBLISHED_WHERE,
      orderBy: { displayOrder: 'asc' },
      include: { mediaAsset: { select: { id: true, key: true, mimeType: true, byteSize: true } } },
    });
  }

  listDocumentsAdmin() {
    return this.prisma.publicDocument.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  createDocument(data: Prisma.PublicDocumentUncheckedCreateInput) {
    return this.prisma.publicDocument.create({ data });
  }

  async updateDocument(id: string, data: Prisma.PublicDocumentUncheckedUpdateInput) {
    await this.assertExists(
      this.prisma.publicDocument.findFirst({ where: { id, deletedAt: null } }),
      'Hujjat',
    );
    return this.prisma.publicDocument.update({ where: { id }, data });
  }

  async deleteDocument(id: string) {
    await this.assertExists(
      this.prisma.publicDocument.findFirst({ where: { id, deletedAt: null } }),
      'Hujjat',
    );
    await this.prisma.publicDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ===========================================================================
  // ISHLAB CHIQARISH BOSQICHLARI VA BOSH SAHIFA
  // ===========================================================================

  listProductionStepsPublic() {
    return this.prisma.productionStep.findMany({
      where: PUBLISHED_ONLY,
      orderBy: { displayOrder: 'asc' },
      include: { mediaAsset: MEDIA_SELECT },
    });
  }

  listProductionStepsAdmin() {
    return this.prisma.productionStep.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  /** Bosqichlar ro'yxati qat'iy — shuning uchun yaratish emas, upsert. */
  upsertProductionStep(slug: string, data: Prisma.ProductionStepUncheckedCreateInput) {
    return this.prisma.productionStep.upsert({
      where: { slug },
      update: data,
      create: { ...data, slug },
    });
  }

  listHomepageSectionsPublic() {
    return this.prisma.homepageSection.findMany({
      where: PUBLISHED_ONLY,
      orderBy: { displayOrder: 'asc' },
      include: { mediaAsset: MEDIA_SELECT },
    });
  }

  listHomepageSectionsAdmin() {
    return this.prisma.homepageSection.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  upsertHomepageSection(key: string, data: Prisma.HomepageSectionUncheckedCreateInput) {
    return this.prisma.homepageSection.upsert({
      where: { key },
      update: data,
      create: { ...data, key },
    });
  }

  // ===========================================================================
  // SEO
  // ===========================================================================

  findSeo(path: string) {
    return this.prisma.seoMetadata.findUnique({
      where: { path },
      include: { ogImage: { select: { id: true, key: true } } },
    });
  }

  listSeoAdmin() {
    return this.prisma.seoMetadata.findMany({ orderBy: { path: 'asc' } });
  }

  upsertSeo(path: string, data: Prisma.SeoMetadataUncheckedCreateInput) {
    return this.prisma.seoMetadata.upsert({
      where: { path },
      update: data,
      create: { ...data, path },
    });
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
