import { Injectable } from '@nestjs/common';
import { type Prisma } from '@barff/db';

/**
 * Hisob-faktura va to'lov raqamlari: `INV-2026-000001`,
 * `PAY-2026-000001`.
 *
 * Hisoblagich ATOMAR oshiriladi — `INSERT ... ON CONFLICT DO
 * UPDATE ... RETURNING`. "O'qi -> +1 -> yoz" yondashuvida bir
 * vaqtda kelgan ikkita yozuv BIR XIL raqam olardi; bu S26 da
 * buyurtma raqamlari uchun o'lchab tekshirilgan.
 *
 * MOLIYAVIY HUJJATDA bu ayniqsa muhim: ikkita hisob-faktura bir
 * xil raqam olsa, buxgalteriya qaysi biri to'langanini ayta
 * olmaydi.
 *
 * Raqam TRANZAKSIYA ICHIDA olinadi: yozuv yaratilmasa,
 * hisoblagich ham oshmaydi.
 */
@Injectable()
export class BillingNumberService {
  async nextInvoice(tx: Prisma.TransactionClient, at = new Date()): Promise<string> {
    return this.next(tx, 'invoice', 'INV', at);
  }

  async nextPayment(tx: Prisma.TransactionClient, at = new Date()): Promise<string> {
    return this.next(tx, 'payment', 'PAY', at);
  }

  private async next(
    tx: Prisma.TransactionClient,
    scope: string,
    prefix: string,
    at: Date,
  ): Promise<string> {
    const year = at.getFullYear();

    const [row] = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO "sequence_counters" ("scope", "year", "value")
      VALUES (${scope}, ${year}, 1)
      ON CONFLICT ("scope", "year") DO UPDATE
        SET "value" = "sequence_counters"."value" + 1
      RETURNING "value"`;

    return `${prefix}-${year}-${String(row?.value ?? 1).padStart(6, '0')}`;
  }
}
