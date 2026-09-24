-- CreateEnum
CREATE TYPE "DealerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "dealer_tiers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dealer_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT,
    "region" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "status" "DealerStatus" NOT NULL DEFAULT 'PENDING',
    "tierId" UUID,
    "creditLimit" INTEGER,
    "internalNote" TEXT,
    "statusReason" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "leadId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_addresses" (
    "id" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT,
    "street" TEXT NOT NULL,
    "notes" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dealer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_events" (
    "id" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "fromStatus" "DealerStatus",
    "toStatus" "DealerStatus" NOT NULL,
    "note" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dealer_tiers_code_key" ON "dealer_tiers"("code");

-- CreateIndex
CREATE INDEX "dealer_tiers_isActive_displayOrder_idx" ON "dealer_tiers"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "dealers_userId_key" ON "dealers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dealers_taxId_key" ON "dealers"("taxId");

-- CreateIndex
CREATE INDEX "dealers_status_createdAt_idx" ON "dealers"("status", "createdAt");

-- CreateIndex
CREATE INDEX "dealers_tierId_idx" ON "dealers"("tierId");

-- CreateIndex
CREATE INDEX "dealers_region_idx" ON "dealers"("region");

-- CreateIndex
CREATE INDEX "dealer_addresses_dealerId_isDefault_idx" ON "dealer_addresses"("dealerId", "isDefault");

-- CreateIndex
CREATE INDEX "dealer_events_dealerId_createdAt_idx" ON "dealer_events"("dealerId", "createdAt");

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "dealer_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_addresses" ADD CONSTRAINT "dealer_addresses_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_events" ADD CONSTRAINT "dealer_events_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_events" ADD CONSTRAINT "dealer_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
