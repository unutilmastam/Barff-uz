/*
  Warnings:

  - Changed the type of `productName` on the `invoice_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "productName",
ADD COLUMN     "productName" JSONB NOT NULL;
