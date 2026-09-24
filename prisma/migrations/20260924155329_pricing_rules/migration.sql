-- CreateEnum
CREATE TYPE "PriceRuleKind" AS ENUM ('FIXED_PRICE', 'PERCENT_DISCOUNT', 'AMOUNT_DISCOUNT');

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "minOrderQuantity" INTEGER;

-- CreateTable
CREATE TABLE "price_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PriceRuleKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "variantId" UUID,
    "productId" UUID,
    "categoryId" UUID,
    "dealerId" UUID,
    "tierId" UUID,
    "region" TEXT,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_rules_code_key" ON "price_rules"("code");

-- CreateIndex
CREATE INDEX "price_rules_isActive_validFrom_validTo_idx" ON "price_rules"("isActive", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "price_rules_variantId_idx" ON "price_rules"("variantId");

-- CreateIndex
CREATE INDEX "price_rules_productId_idx" ON "price_rules"("productId");

-- CreateIndex
CREATE INDEX "price_rules_categoryId_idx" ON "price_rules"("categoryId");

-- CreateIndex
CREATE INDEX "price_rules_dealerId_idx" ON "price_rules"("dealerId");

-- CreateIndex
CREATE INDEX "price_rules_tierId_idx" ON "price_rules"("tierId");

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "dealer_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
