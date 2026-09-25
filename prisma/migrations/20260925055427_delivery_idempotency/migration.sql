-- AlterTable
ALTER TABLE "delivery_events" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "delivery_events_deliveryId_idempotencyKey_key" ON "delivery_events"("deliveryId", "idempotencyKey");

