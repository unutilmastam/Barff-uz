import {
  adminContentListQuerySchema,
  certificateCreateSchema,
  certificateUpdateSchema,
  contentListQuerySchema,
  galleryItemCreateSchema,
  galleryItemUpdateSchema,
  homepageSectionUpsertSchema,
  newsCreateSchema,
  newsUpdateSchema,
  productionStepUpsertSchema,
  publicDocumentCreateSchema,
  publicDocumentUpdateSchema,
  seoMetadataUpsertSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class NewsCreateDto extends createZodDto(newsCreateSchema) {}
export class NewsUpdateDto extends createZodDto(newsUpdateSchema) {}

export class CertificateCreateDto extends createZodDto(certificateCreateSchema) {}
export class CertificateUpdateDto extends createZodDto(certificateUpdateSchema) {}

export class GalleryItemCreateDto extends createZodDto(galleryItemCreateSchema) {}
export class GalleryItemUpdateDto extends createZodDto(galleryItemUpdateSchema) {}

export class PublicDocumentCreateDto extends createZodDto(publicDocumentCreateSchema) {}
export class PublicDocumentUpdateDto extends createZodDto(publicDocumentUpdateSchema) {}

export class ProductionStepUpsertDto extends createZodDto(productionStepUpsertSchema) {}
export class HomepageSectionUpsertDto extends createZodDto(homepageSectionUpsertSchema) {}
export class SeoMetadataUpsertDto extends createZodDto(seoMetadataUpsertSchema) {}

export class ContentListQueryDto extends createZodDto(contentListQuerySchema) {}
export class AdminContentListQueryDto extends createZodDto(adminContentListQuerySchema) {}
