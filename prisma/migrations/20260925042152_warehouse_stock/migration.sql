-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'RESERVED', 'RELEASED', 'TRANSFER', 'ADJUSTMENT', 'RETURN');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stock" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL DEFAULT 0,
    "reservedAfter" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "reference" TEXT,
    "relatedWarehouseId" UUID,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_isActive_idx" ON "warehouses"("isActive");

-- CreateIndex
CREATE INDEX "warehouse_stock_productVariantId_idx" ON "warehouse_stock"("productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stock_warehouseId_productVariantId_key" ON "warehouse_stock"("warehouseId", "productVariantId");

-- CreateIndex
CREATE INDEX "stock_movements_warehouseId_createdAt_idx" ON "stock_movements"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_productVariantId_createdAt_idx" ON "stock_movements"("productVariantId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_type_createdAt_idx" ON "stock_movements"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_relatedWarehouseId_fkey" FOREIGN KEY ("relatedWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- QOLDIQ = HARAKATLAR JURNALINING PROYEKSIYASI
-- =============================================================================
--
-- `ROADMAP.md` S30 DoD: "stock can never change without a movement row".
--
-- Buni SERVIS INTIZOMI bilan ta'minlab bo'lmaydi: har qanday kod
-- `warehouse_stock` ni to'g'ridan-to'g'ri yangilay olardi va qoldiq
-- jurnaldan ajralib ketardi — omborchi raqamni ko'radi, lekin uning
-- QAYERDAN kelganini hech kim ayta olmaydi.
--
-- Shuning uchun qoida BAZADA:
--
--   1. `stock_movements` ga qator qo'shilishi qoldiqni o'zgartiradi.
--   2. `warehouse_stock` ni to'g'ridan-to'g'ri yangilash RAD ETILADI.
--   3. Yozilgan harakat TAHRIRLANMAYDI va O'CHIRILMAYDI.
--
-- Ikkinchisi `pg_trigger_depth()` bilan aniqlanadi: ilovadan kelgan
-- `UPDATE` chuqurlik 1 da, trigger ichidan kelgani esa 2 da ishlaydi.
--
-- XATO XABARLARIDAGI `BARFF_...` PREFIKSI — MASHINA UCHUN.
--
-- Prisma trigger xatosini `PrismaClientUnknownRequestError` qilib
-- beradi: `code` ham, `meta` ham BO'SH (o'lchab tekshirilgan), ya'ni
-- `23514` SQLSTATE ilovaga yetib kelmaydi. Yagona ilinadigan joy —
-- xabar matni. Matnning O'ZBEKCHA qismiga tayanish esa uni
-- tarjima qilganda jimgina buzilardi, shuning uchun har bir xato
-- barqaror KOD bilan boshlanadi.

CREATE OR REPLACE FUNCTION barff_apply_stock_movement() RETURNS trigger AS $$
DECLARE
  qty_delta integer := 0;
  res_delta integer := 0;
  new_qty integer;
  new_res integer;
BEGIN
  -- Ishorani TURNING O'ZI belgilaydi, `ADJUSTMENT` va `TRANSFER` dan
  -- tashqari: ularda miqdor ataylab ishorali keladi.
  CASE NEW."type"
    WHEN 'IN' THEN qty_delta := abs(NEW."quantity");
    WHEN 'RETURN' THEN qty_delta := abs(NEW."quantity");
    WHEN 'OUT' THEN qty_delta := -abs(NEW."quantity");
    WHEN 'ADJUSTMENT' THEN qty_delta := NEW."quantity";
    WHEN 'TRANSFER' THEN qty_delta := NEW."quantity";
    WHEN 'RESERVED' THEN res_delta := abs(NEW."quantity");
    WHEN 'RELEASED' THEN res_delta := -abs(NEW."quantity");
  END CASE;

  IF NEW."type" = 'ADJUSTMENT' AND (NEW."reason" IS NULL OR btrim(NEW."reason") = '') THEN
    RAISE EXCEPTION 'BARFF_STOCK_REASON_REQUIRED: tuzatish uchun sabab shart'
      USING ERRCODE = 'check_violation';
  END IF;

  IF qty_delta = 0 AND res_delta = 0 THEN
    RAISE EXCEPTION 'BARFF_STOCK_ZERO_QUANTITY: harakat miqdori nol bo''lishi mumkin emas'
      USING ERRCODE = 'check_violation';
  END IF;

  -- `INSERT ... ON CONFLICT DO UPDATE` — qator yo'q bo'lsa yaratadi,
  -- bor bo'lsa ATOMAR qo'shadi. "Oldin o'qib, keyin yozish" bir
  -- vaqtda kelgan ikki harakatda birini YO'QOTARDI.
  INSERT INTO "warehouse_stock" ("id", "warehouseId", "productVariantId", "quantity", "reservedQuantity", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), NEW."warehouseId", NEW."productVariantId", qty_delta, res_delta, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT ("warehouseId", "productVariantId") DO UPDATE
    SET "quantity" = "warehouse_stock"."quantity" + qty_delta,
        "reservedQuantity" = "warehouse_stock"."reservedQuantity" + res_delta,
        "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "quantity", "reservedQuantity" INTO new_qty, new_res;

  -- Mumkin bo'lmagan holatlar. Ular BAZADA tekshiriladi, chunki
  -- ilovadagi tekshiruv poygada o'tkazib yuborilishi mumkin.
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'BARFF_STOCK_INSUFFICIENT: qoldiq manfiy bo''la olmaydi (% dona yetishmadi)', -new_qty
      USING ERRCODE = 'check_violation';
  END IF;

  IF new_res < 0 THEN
    RAISE EXCEPTION 'BARFF_STOCK_RELEASE_EXCEEDS: band qilingan miqdor manfiy bo''la olmaydi'
      USING ERRCODE = 'check_violation';
  END IF;

  IF new_res > new_qty THEN
    RAISE EXCEPTION 'BARFF_STOCK_RESERVED_EXCEEDS: band qilingan miqdor qoldiqdan oshib ketdi (% > %)', new_res, new_qty
      USING ERRCODE = 'check_violation';
  END IF;

  -- Jurnal qatori O'ZINI tushuntirsin: keyingi holat yoziladi.
  -- Bu `UPDATE`, ya'ni `AFTER INSERT` triggerini qayta chaqirmaydi.
  UPDATE "stock_movements"
     SET "quantityAfter" = new_qty, "reservedAfter" = new_res
   WHERE "id" = NEW."id";

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_applied
  AFTER INSERT ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION barff_apply_stock_movement();

-- ---------------------------------------------------------------------------
-- QOLDIQNI TO'G'RIDAN-TO'G'RI O'ZGARTIRISH TAQIQLANADI
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION barff_guard_warehouse_stock() RETURNS trigger AS $$
BEGIN
  -- Yuqoridagi trigger ichidan kelgan o'zgarish chuqurlik 2 da bo'ladi.
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'BARFF_STOCK_DIRECT_WRITE: qoldiq faqat stock_movements orqali o''zgaradi'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kuzatuv chegarasi qoldiq EMAS — uni tahrirlashga ruxsat.
CREATE TRIGGER warehouse_stock_guard
  BEFORE UPDATE OF "quantity", "reservedQuantity" ON "warehouse_stock"
  FOR EACH ROW EXECUTE FUNCTION barff_guard_warehouse_stock();

CREATE OR REPLACE FUNCTION barff_guard_stock_movement_immutable() RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'BARFF_STOCK_LEDGER_IMMUTABLE: harakat jurnali o''zgartirilmaydi — xatoni ADJUSTMENT bilan to''g''rilang'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- `quantityAfter`/`reservedAfter` ni trigger yozadi, shuning uchun
-- qo'riqlash faqat MA'NOLI maydonlarga qo'yiladi.
CREATE TRIGGER stock_movement_immutable
  BEFORE UPDATE OF "warehouseId", "productVariantId", "type", "quantity", "reason", "reference", "relatedWarehouseId", "actorId"
  ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION barff_guard_stock_movement_immutable();

CREATE OR REPLACE FUNCTION barff_guard_stock_movement_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'BARFF_STOCK_LEDGER_IMMUTABLE: harakat jurnalidan qator o''chirilmaydi'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_no_delete
  BEFORE DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION barff_guard_stock_movement_delete();

-- ---------------------------------------------------------------------------
-- BITTA STANDART OMBOR
-- ---------------------------------------------------------------------------
--
-- Qisman indeks: ikkita standart ombor bo'lsa, "kelim qayerga
-- tushadi" degan savol javobsiz qolardi.

CREATE UNIQUE INDEX "warehouses_single_default"
  ON "warehouses" ("isDefault")
  WHERE "isDefault" = true AND "deletedAt" IS NULL;
