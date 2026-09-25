import { Injectable } from '@nestjs/common';
import { type Prisma } from '@barff/db';

/**
 * Yetkazma raqami: `DLV-2026-000001`.
 *
 * Hisoblagich ATOMAR oshiriladi — `INSERT ... ON CONFLICT DO
 * UPDATE ... RETURNING`. "O'qi -> +1 -> yoz" yondashuvida bir
 * vaqtda kelgan ikkita yetkazma BIR XIL raqam olardi; bu S26 da
 * buyurtma raqamlari uchun o'lchab tekshirilgan va shu yerda
 * takrorlanmaydi.
 *
 * Raqam TRANZAKSIYA ICHIDA olinadi: yetkazma yaratilmasa,
 * hisoblagich ham oshmaydi.
 */
@Injectable()
export class DeliveryNumberService {
  async next(tx: Prisma.TransactionClient, at = new Date()): Promise<string> {
    const year = at.getFullYear();

    const [row] = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO "sequence_counters" ("scope", "year", "value")
      VALUES ('delivery', ${year}, 1)
      ON CONFLICT ("scope", "year") DO UPDATE
        SET "value" = "sequence_counters"."value" + 1
      RETURNING "value"`;

    return `DLV-${year}-${String(row?.value ?? 1).padStart(6, '0')}`;
  }
}
