-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "news" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "excerpt" JSONB,
    "body" JSONB NOT NULL,
    "coverImageId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "seo" JSONB,
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "issuer" TEXT,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "mediaAssetId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "caption" JSONB,
    "album" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "mediaAssetId" UUID NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_steps" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "mediaAssetId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_metadata" (
    "id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "title" JSONB,
    "description" JSONB,
    "ogImageId" UUID,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "heading" JSONB,
    "subheading" JSONB,
    "ctaLabel" JSONB,
    "ctaHref" TEXT,
    "mediaAssetId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE INDEX "news_status_publishedAt_idx" ON "news"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "news_createdAt_idx" ON "news"("createdAt");

-- CreateIndex
CREATE INDEX "certificates_status_displayOrder_idx" ON "certificates"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "gallery_items_status_album_displayOrder_idx" ON "gallery_items"("status", "album", "displayOrder");

-- CreateIndex
CREATE INDEX "documents_status_displayOrder_idx" ON "documents"("status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "production_steps_slug_key" ON "production_steps"("slug");

-- CreateIndex
CREATE INDEX "production_steps_status_displayOrder_idx" ON "production_steps"("status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_path_key" ON "seo_metadata"("path");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_sections_key_key" ON "homepage_sections"("key");

-- CreateIndex
CREATE INDEX "homepage_sections_status_displayOrder_idx" ON "homepage_sections"("status", "displayOrder");

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_steps" ADD CONSTRAINT "production_steps_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
