import { Injectable } from '@nestjs/common';
import { type Prisma } from '@barff/db';

/**
 * Buyurtma raqami: `BRF-2026-000123`.
 *
 * NEGA HISOBLAGICH JADVALI, `COUNT(*) + 1` EMAS:
 *
 * Ikki buyurtma bir vaqtda yaratilsa, ikkalasi ham bir xil sanoqni
 * o'qib, BIR XIL raqam olardi — va `number` yagona bo'lgani uchun
 * biri xato bilan yiqilardi. `UPDATE ... RETURNING` esa atomar:
 * Postgres qatorni bloklaydi va ikkinchi tranzaksiya yangi qiymatni
 * oladi.
 *
 * Raqam YIL bo'yicha qayta boshlanadi — buxgalteriyada shunday
 * qulay.
 */
@Injectable()
export class OrderNumberService {
  /** TRANZAKSIYA ICHIDA chaqiriladi: raqam buyurtma bilan birga tug'iladi. */
  async next(tx: Prisma.TransactionClient, at: Date = new Date()): Promise<string> {
    const year = at.getUTCFullYear();

    const [row] = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO "order_counters" ("year", "value")
      VALUES (${year}, 1)
      ON CONFLICT ("year") DO UPDATE SET "value" = "order_counters"."value" + 1
      RETURNING "value"
    `;

    /* c8 ignore next -- `RETURNING` har doim bitta qator beradi */
    if (row === undefined) throw new Error('Buyurtma raqamini olishda xato');

    return `BRF-${year}-${String(row.value).padStart(6, '0')}`;
  }
}
