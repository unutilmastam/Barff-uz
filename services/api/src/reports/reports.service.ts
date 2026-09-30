import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@barff/db';
import {
  REPORTS,
  REPORT_TIME_ZONE,
  SALES_ORDER_STATUSES,
  type ReportColumn,
  type ReportFilter,
  type ReportKey,
  type ReportResult,
} from '@barff/types';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportFilters {
  from?: string | undefined;
  to?: string | undefined;
  region?: string | undefined;
  dealerId?: string | undefined;
  productId?: string | undefined;
}

type Row = Record<string, string | number | null>;

interface Built {
  columns: ReportColumn[];
  rows: Row[];
  totals: Record<string, number>;
}

/** Standart JSON chegarasi. Eksport bunga BOG'LIQ EMAS. */
export const DEFAULT_ROW_LIMIT = 1000;

/**
 * O'zbekiston UTC+5 va yozgi vaqtga o'tmaydi. Kun chegaralari shu
 * siljish bilan UTC ga aylantiriladi (`docs/REPORTS-POLICY.md` §2).
 */
const TASHKENT_OFFSET = '+05:00';

/** Toshkent kunining boshi — UTC lahzasi sifatida. */
export function dayStartUtc(day: string): Date {
  return new Date(`${day}T00:00:00.000${TASHKENT_OFFSET}`);
}

/** Toshkent kunining OXIRI (keyingi kun boshi) — `<` bilan solishtiriladi. */
export function dayEndExclusiveUtc(day: string): Date {
  return new Date(dayStartUtc(day).getTime() + 24 * 60 * 60 * 1000);
}

/** Bazadagi `timestamp` ustuni bilan aniq solishtirish uchun (vaqt zonasisiz, UTC). */
function utcParam(date: Date): Prisma.Sql {
  return Prisma.sql`${date.toISOString().replace('Z', '')}::timestamp`;
}

function localDay(column: string): Prisma.Sql {
  return Prisma.raw(`((${column} AT TIME ZONE 'UTC') AT TIME ZONE '${REPORT_TIME_ZONE}')::date`);
}

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

/** Foiz — bir kasr raqamgacha. Hisobot ham, test ham shu qoida bilan. */
export function percent(part: number, whole: number): number {
  if (whole === 0) return 0;

  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Hisobotlar (CLAUDE.md §22, S37).
 *
 * Siyosat: `docs/REPORTS-POLICY.md`.
 *
 * HAR BIR HISOBOT MANBA JADVALDAN BEVOSITA hisoblanadi (SQL
 * agregatsiya). Oraliq jadval yoki keshlangan yig'indi YO'Q: u
 * manbadan ajralib ketardi va hisobot raqami "hisob-faktura
 * raqamiga mos kelmaydi" degan shikoyatga aylanardi. Mosligi
 * `test/reports.e2e-spec.ts` da MUSTAQIL hisob bilan tekshiriladi.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return REPORTS;
  }

  /**
   * Hisobotga TEGISHLI BO'LMAGAN filtr — XATO, jim e'tiborsizlik emas.
   *
   * `stock` hisobotiga `dealerId` yuborgan API iste'molchisi filtrlangan
   * natija oldim deb o'ylardi, aslida esa BUTUN qoldiq kelardi.
   */
  assertFilters(key: ReportKey, filters: ReportFilters): void {
    const definition = REPORTS.find((report) => report.key === key);
    const allowed = new Set<ReportFilter>(definition?.filters ?? []);
    const unsupported = (Object.keys(filters) as ReportFilter[]).filter(
      (name) => filters[name] !== undefined && !allowed.has(name),
    );

    if (unsupported.length > 0) {
      throw new BadRequestException({
        message: `«${definition?.title ?? key}» hisoboti bu filtrlarni qo‘llamaydi: ${unsupported.join(', ')}`,
        code: 'REPORT_FILTER_UNSUPPORTED',
      });
    }
  }

  async run(
    key: ReportKey,
    filters: ReportFilters,
    options: { limit?: number | undefined; unlimited?: boolean | undefined } = {},
  ): Promise<ReportResult> {
    this.assertFilters(key, filters);

    const built = await this.build(key, filters, options.limit);
    const limit = options.limit ?? DEFAULT_ROW_LIMIT;
    const truncated = options.unlimited !== true && built.rows.length > limit;

    const title = REPORTS.find((report) => report.key === key)?.title ?? key;

    return {
      key,
      title,
      columns: built.columns,
      rows: options.unlimited === true ? built.rows : built.rows.slice(0, limit),
      totals: built.totals,
      truncated,
      rowLimit: limit,
      filters: Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined),
      ) as ReportResult['filters'],
      generatedAt: new Date().toISOString(),
    };
  }

  private async build(key: ReportKey, filters: ReportFilters, limit?: number): Promise<Built> {
    switch (key) {
      case 'sales':
        return this.sales(filters);
      case 'orders':
        return this.orders(filters);
      case 'dealer-performance':
        return this.dealerPerformance(filters);
      case 'product-sales':
        return this.productSales(filters);
      case 'regional-sales':
        return this.regionalSales(filters);
      case 'stock':
        return this.stock(filters);
      case 'stock-movements':
        return this.stockMovementsSummary(filters, limit ?? DEFAULT_ROW_LIMIT);
      case 'deliveries':
        return this.deliveries(filters);
      case 'driver-performance':
        return this.driverPerformance(filters);
      case 'lead-conversion':
        return this.leadConversion(filters);
    }
  }

  // ---------------------------------------------------------------- shartlar

  /** `alias.createdAt` uchun sana oralig'i. */
  private range(column: string, filters: ReportFilters): Prisma.Sql[] {
    const parts: Prisma.Sql[] = [];

    if (filters.from !== undefined) {
      parts.push(Prisma.sql`${Prisma.raw(column)} >= ${utcParam(dayStartUtc(filters.from))}`);
    }

    if (filters.to !== undefined) {
      parts.push(Prisma.sql`${Prisma.raw(column)} < ${utcParam(dayEndExclusiveUtc(filters.to))}`);
    }

    return parts;
  }

  private regionIs(column: string, filters: ReportFilters): Prisma.Sql[] {
    return filters.region === undefined
      ? []
      : [Prisma.sql`lower(trim(${Prisma.raw(column)})) = lower(trim(${filters.region}))`];
  }

  private where(parts: Prisma.Sql[]): Prisma.Sql {
    return parts.length === 0 ? Prisma.empty : Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
  }

  /** Sotuv hisoblanadigan buyurtmalar (`SALES_ORDER_STATUSES`). */
  private salesOrders(filters: ReportFilters): Prisma.Sql[] {
    return [
      Prisma.sql`o."deletedAt" IS NULL`,
      Prisma.sql`o.status::text = ANY(${[...SALES_ORDER_STATUSES]})`,
      ...this.range('o."createdAt"', filters),
      ...this.regionIs('o."shippingRegion"', filters),
      ...(filters.dealerId !== undefined
        ? [Prisma.sql`o."dealerId" = ${filters.dealerId}::uuid`]
        : []),
    ];
  }

  // ---------------------------------------------------------------- 1. sotuv

  private async sales(filters: ReportFilters): Promise<Built> {
    const rows = await this.prisma.$queryRaw<
      {
        day: Date;
        orders: number;
        subtotal: bigint;
        discount: bigint;
        total: bigint;
        delivered: number;
      }[]
    >`
      SELECT ${localDay('o."createdAt"')} AS day,
             count(*)::int AS orders,
             coalesce(sum(o.subtotal), 0)::bigint AS subtotal,
             coalesce(sum(o.discount), 0)::bigint AS discount,
             coalesce(sum(o.total), 0)::bigint AS total,
             (count(*) FILTER (WHERE o.status = 'DELIVERED'))::int AS delivered
      FROM orders o
      ${this.where(this.salesOrders(filters))}
      GROUP BY 1
      ORDER BY 1`;

    const data: Row[] = rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      orders: num(row.orders),
      subtotal: num(row.subtotal),
      discount: num(row.discount),
      total: num(row.total),
      delivered: num(row.delivered),
    }));

    return {
      columns: [
        { key: 'day', label: 'Kun', type: 'date' },
        { key: 'orders', label: 'Buyurtmalar', type: 'integer' },
        { key: 'subtotal', label: 'Oraliq jami', type: 'money' },
        { key: 'discount', label: 'Chegirma', type: 'money' },
        { key: 'total', label: 'Jami', type: 'money' },
        { key: 'delivered', label: 'Yetkazilgan', type: 'integer' },
      ],
      rows: data,
      totals: sumOf(data, ['orders', 'subtotal', 'discount', 'total', 'delivered']),
    };
  }

  // ------------------------------------------------------------ 2. buyurtmalar

  private async orders(filters: ReportFilters): Promise<Built> {
    const parts = [
      Prisma.sql`o."deletedAt" IS NULL`,
      ...this.range('o."createdAt"', filters),
      ...this.regionIs('o."shippingRegion"', filters),
      ...(filters.dealerId !== undefined
        ? [Prisma.sql`o."dealerId" = ${filters.dealerId}::uuid`]
        : []),
    ];

    const rows = await this.prisma.$queryRaw<{ status: string; orders: number; total: bigint }[]>`
      SELECT o.status::text AS status, count(*)::int AS orders, coalesce(sum(o.total), 0)::bigint AS total
      FROM orders o
      ${this.where(parts)}
      GROUP BY o.status
      ORDER BY o.status`;

    const data: Row[] = rows.map((row) => ({
      status: row.status,
      orders: num(row.orders),
      total: num(row.total),
    }));

    return {
      columns: [
        { key: 'status', label: 'Holat', type: 'text' },
        { key: 'orders', label: 'Buyurtmalar', type: 'integer' },
        { key: 'total', label: 'Summa', type: 'money' },
      ],
      rows: data,
      totals: sumOf(data, ['orders', 'total']),
    };
  }

  // ------------------------------------------------------ 3. dilerlar samaradorligi

  private async dealerPerformance(filters: ReportFilters): Promise<Built> {
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        companyName: string;
        region: string;
        orders: number;
        total: bigint;
        delivered: number;
        deliveredTotal: bigint;
      }[]
    >`
      SELECT d.id, d."companyName", d.region,
             count(*)::int AS orders,
             coalesce(sum(o.total), 0)::bigint AS total,
             (count(*) FILTER (WHERE o.status = 'DELIVERED'))::int AS delivered,
             coalesce(sum(o.total) FILTER (WHERE o.status = 'DELIVERED'), 0)::bigint AS "deliveredTotal"
      FROM orders o
      JOIN dealers d ON d.id = o."dealerId"
      ${this.where(this.salesOrders(filters))}
      GROUP BY d.id, d."companyName", d.region
      ORDER BY total DESC, d."companyName"`;

    const data: Row[] = rows.map((row) => {
      const orders = num(row.orders);
      const total = num(row.total);
      const delivered = num(row.delivered);

      return {
        dealer: row.companyName,
        region: row.region,
        orders,
        total,
        average: orders === 0 ? 0 : Math.floor(total / orders),
        delivered,
        deliveredTotal: num(row.deliveredTotal),
        deliveredShare: percent(delivered, orders),
      };
    });

    const totals = sumOf(data, ['orders', 'total', 'delivered', 'deliveredTotal']);
    totals['deliveredShare'] = percent(totals['delivered'] ?? 0, totals['orders'] ?? 0);

    return {
      columns: [
        { key: 'dealer', label: 'Diler', type: 'text' },
        { key: 'region', label: 'Hudud', type: 'text' },
        { key: 'orders', label: 'Buyurtmalar', type: 'integer' },
        { key: 'total', label: 'Jami', type: 'money' },
        { key: 'average', label: 'O‘rtacha buyurtma', type: 'money' },
        { key: 'delivered', label: 'Yetkazilgan', type: 'integer' },
        { key: 'deliveredTotal', label: 'Yetkazilgan summa', type: 'money' },
        { key: 'deliveredShare', label: 'Yetkazilgan ulushi', type: 'percent' },
      ],
      rows: data,
      totals,
    };
  }

  // ------------------------------------------------------------ 4. mahsulot sotuvi

  private async productSales(filters: ReportFilters): Promise<Built> {
    const parts = [
      ...this.salesOrders(filters),
      ...(filters.productId !== undefined
        ? [Prisma.sql`pv."productId" = ${filters.productId}::uuid`]
        : []),
    ];

    const rows = await this.prisma.$queryRaw<
      {
        variantId: string;
        sku: string;
        name: string | null;
        volumeMl: number;
        quantity: bigint;
        revenue: bigint;
        orders: number;
      }[]
    >`
      SELECT oi."variantId", max(oi.sku) AS sku,
             max(oi."productName"->>'uz') AS name,
             max(oi."volumeMl") AS "volumeMl",
             coalesce(sum(oi.quantity), 0)::bigint AS quantity,
             coalesce(sum(oi.total), 0)::bigint AS revenue,
             count(DISTINCT oi."orderId")::int AS orders
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN product_variants pv ON pv.id = oi."variantId"
      ${this.where(parts)}
      GROUP BY oi."variantId"
      ORDER BY revenue DESC, sku`;

    const data: Row[] = rows.map((row) => ({
      sku: row.sku,
      product: row.name ?? '—',
      volumeMl: num(row.volumeMl),
      quantity: num(row.quantity),
      revenue: num(row.revenue),
      orders: num(row.orders),
    }));

    return {
      columns: [
        { key: 'sku', label: 'SKU', type: 'text' },
        { key: 'product', label: 'Mahsulot', type: 'text' },
        { key: 'volumeMl', label: 'Hajm (ml)', type: 'integer' },
        { key: 'quantity', label: 'Sotilgan miqdor', type: 'integer' },
        { key: 'revenue', label: 'Tushum', type: 'money' },
        { key: 'orders', label: 'Buyurtmalar', type: 'integer' },
      ],
      rows: data,
      // `orders` bu yerda QO'SHILMAYDI: bitta buyurtma bir necha mahsulotda uchraydi va yig'indi ikki marta sanardi.
      totals: sumOf(data, ['quantity', 'revenue']),
    };
  }

  // ------------------------------------------------------------ 5. hududlar

  private async regionalSales(filters: ReportFilters): Promise<Built> {
    const rows = await this.prisma.$queryRaw<
      { region: string; orders: number; total: bigint; delivered: number }[]
    >`
      SELECT min(trim(o."shippingRegion")) AS region,
             count(*)::int AS orders,
             coalesce(sum(o.total), 0)::bigint AS total,
             (count(*) FILTER (WHERE o.status = 'DELIVERED'))::int AS delivered
      FROM orders o
      ${this.where(this.salesOrders(filters))}
      GROUP BY lower(trim(o."shippingRegion"))
      ORDER BY total DESC, region`;

    const data: Row[] = rows.map((row) => ({
      region: row.region,
      orders: num(row.orders),
      total: num(row.total),
      delivered: num(row.delivered),
    }));

    return {
      columns: [
        { key: 'region', label: 'Hudud', type: 'text' },
        { key: 'orders', label: 'Buyurtmalar', type: 'integer' },
        { key: 'total', label: 'Jami', type: 'money' },
        { key: 'delivered', label: 'Yetkazilgan', type: 'integer' },
      ],
      rows: data,
      totals: sumOf(data, ['orders', 'total', 'delivered']),
    };
  }

  // ------------------------------------------------------------ 6. qoldiqlar

  private async stock(filters: ReportFilters): Promise<Built> {
    const parts = [
      Prisma.sql`w."deletedAt" IS NULL`,
      ...this.regionIs('w.region', filters),
      ...(filters.productId !== undefined
        ? [Prisma.sql`pv."productId" = ${filters.productId}::uuid`]
        : []),
    ];

    const rows = await this.prisma.$queryRaw<
      {
        code: string;
        warehouse: string;
        region: string;
        sku: string;
        volumeMl: number;
        product: string | null;
        quantity: number;
        reserved: number;
      }[]
    >`
      SELECT w.code, w.name AS warehouse, w.region, pv.sku, pv."volumeMl",
             p.name->>'uz' AS product,
             ws.quantity, ws."reservedQuantity" AS reserved
      FROM warehouse_stock ws
      JOIN warehouses w ON w.id = ws."warehouseId"
      JOIN product_variants pv ON pv.id = ws."productVariantId"
      JOIN products p ON p.id = pv."productId"
      ${this.where(parts)}
      ORDER BY w.code, pv.sku`;

    const data: Row[] = rows.map((row) => ({
      warehouse: `${row.code} — ${row.warehouse}`,
      region: row.region,
      sku: row.sku,
      product: row.product ?? '—',
      volumeMl: num(row.volumeMl),
      quantity: num(row.quantity),
      reserved: num(row.reserved),
      available: num(row.quantity) - num(row.reserved),
    }));

    return {
      columns: [
        { key: 'warehouse', label: 'Ombor', type: 'text' },
        { key: 'region', label: 'Hudud', type: 'text' },
        { key: 'sku', label: 'SKU', type: 'text' },
        { key: 'product', label: 'Mahsulot', type: 'text' },
        { key: 'volumeMl', label: 'Hajm (ml)', type: 'integer' },
        { key: 'quantity', label: 'Qoldiq', type: 'integer' },
        { key: 'reserved', label: 'Band', type: 'integer' },
        { key: 'available', label: 'Mavjud', type: 'integer' },
      ],
      rows: data,
      totals: sumOf(data, ['quantity', 'reserved', 'available']),
    };
  }

  // ------------------------------------------------------ 7. ombor harakatlari

  /** Harakat jurnali uchun filtrlar (Prisma). Ham JSON, ham oqimli eksport shundan foydalanadi. */
  ledgerWhere(filters: ReportFilters): Prisma.StockMovementWhereInput {
    return {
      ...(filters.from !== undefined || filters.to !== undefined
        ? {
            createdAt: {
              ...(filters.from !== undefined ? { gte: dayStartUtc(filters.from) } : {}),
              ...(filters.to !== undefined ? { lt: dayEndExclusiveUtc(filters.to) } : {}),
            },
          }
        : {}),
      ...(filters.region !== undefined
        ? { warehouse: { region: { equals: filters.region.trim(), mode: 'insensitive' as const } } }
        : {}),
      ...(filters.productId !== undefined
        ? { productVariant: { productId: filters.productId } }
        : {}),
    };
  }

  readonly ledgerColumns: ReportColumn[] = [
    { key: 'createdAt', label: 'Vaqt', type: 'datetime' },
    { key: 'warehouse', label: 'Ombor', type: 'text' },
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'type', label: 'Turi', type: 'text' },
    { key: 'quantity', label: 'Miqdor', type: 'integer' },
    { key: 'quantityAfter', label: 'Qoldiq keyin', type: 'integer' },
    { key: 'reason', label: 'Sabab', type: 'text' },
    { key: 'reference', label: 'Havola', type: 'text' },
  ];

  private ledgerRow(movement: {
    createdAt: Date;
    type: string;
    quantity: number;
    quantityAfter: number;
    reason: string | null;
    reference: string | null;
    warehouse: { code: string };
    productVariant: { sku: string };
  }): Row {
    return {
      createdAt: movement.createdAt.toISOString(),
      warehouse: movement.warehouse.code,
      sku: movement.productVariant.sku,
      type: movement.type,
      quantity: movement.quantity,
      quantityAfter: movement.quantityAfter,
      reason: movement.reason,
      reference: movement.reference,
    };
  }

  private async ledgerTotals(filters: ReportFilters): Promise<Record<string, number>> {
    const where = this.ledgerWhere(filters);

    const [count, inbound, outbound] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.aggregate({
        where: { ...where, type: { in: ['IN', 'RETURN'] } },
        _sum: { quantity: true },
      }),
      this.prisma.stockMovement.aggregate({
        where: { ...where, type: 'OUT' },
        _sum: { quantity: true },
      }),
    ]);

    return {
      movements: count,
      inbound: Math.abs(inbound._sum.quantity ?? 0),
      outbound: Math.abs(outbound._sum.quantity ?? 0),
    };
  }

  private async stockMovementsSummary(filters: ReportFilters, limit: number): Promise<Built> {
    const [totals, movements] = await Promise.all([
      this.ledgerTotals(filters),
      this.prisma.stockMovement.findMany({
        where: this.ledgerWhere(filters),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        // +1 — qisqartirilganini aniqlash uchun; ortiqcha qator `run` da kesiladi.
        take: limit + 1,
        select: {
          createdAt: true,
          type: true,
          quantity: true,
          quantityAfter: true,
          reason: true,
          reference: true,
          warehouse: { select: { code: true } },
          productVariant: { select: { sku: true } },
        },
      }),
    ]);

    return { columns: this.ledgerColumns, rows: movements.map((m) => this.ledgerRow(m)), totals };
  }

  /**
   * Harakat jurnalini BO'LAKLAB o'qiydi — eksport uchun.
   *
   * Butun jurnalni bir so'rov bilan xotiraga olish jurnal o'sgan
   * sari API'ni yiqitardi: harakat har bir zaxira, qadoqlash va
   * tuzatishda yoziladi va u hech qachon o'chirilmaydi.
   *
   * KURSOR bilan (`createdAt`, `id`): `OFFSET` katta sahifada sekinlashadi.
   * Xotirada bir vaqtda faqat BITTA bo'lak turadi.
   */
  async *ledgerBatches(filters: ReportFilters, batchSize = 1000): AsyncGenerator<Row[]> {
    this.assertFilters('stock-movements', filters);

    const where = this.ledgerWhere(filters);
    let cursorId: string | undefined;

    for (;;) {
      const batch = await this.prisma.stockMovement.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: batchSize,
        ...(cursorId !== undefined ? { cursor: { id: cursorId }, skip: 1 } : {}),
        select: {
          id: true,
          createdAt: true,
          type: true,
          quantity: true,
          quantityAfter: true,
          reason: true,
          reference: true,
          warehouse: { select: { code: true } },
          productVariant: { select: { sku: true } },
        },
      });

      if (batch.length === 0) return;

      yield batch.map((m) => this.ledgerRow(m));

      const last = batch[batch.length - 1];
      if (batch.length < batchSize || last === undefined) return;
      cursorId = last.id;

      // Boshqa so'rovlarga navbat: uzun eksport hodisalar sikli'ni band qilmasin.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  async ledgerCount(filters: ReportFilters): Promise<number> {
    return this.prisma.stockMovement.count({ where: this.ledgerWhere(filters) });
  }

  // ------------------------------------------------------------ 8. yetkazmalar

  private deliveryParts(filters: ReportFilters): Prisma.Sql[] {
    return [
      Prisma.sql`d."deletedAt" IS NULL`,
      ...this.range('d."createdAt"', filters),
      ...this.regionIs('d."shippingRegion"', filters),
      ...(filters.dealerId !== undefined
        ? [Prisma.sql`o."dealerId" = ${filters.dealerId}::uuid`]
        : []),
    ];
  }

  private async deliveries(filters: ReportFilters): Promise<Built> {
    const rows = await this.prisma.$queryRaw<
      { status: string; deliveries: number; hours: number | null }[]
    >`
      SELECT d.status::text AS status,
             count(*)::int AS deliveries,
             avg(extract(epoch FROM (d."deliveredAt" - d."createdAt")) / 3600.0)
               FILTER (WHERE d.status = 'DELIVERED' AND d."deliveredAt" IS NOT NULL)::float8 AS hours
      FROM deliveries d
      JOIN orders o ON o.id = d."orderId"
      ${this.where(this.deliveryParts(filters))}
      GROUP BY d.status
      ORDER BY d.status`;

    const data: Row[] = rows.map((row) => ({
      status: row.status,
      deliveries: num(row.deliveries),
      // Faqat TOPSHIRILGANLAR uchun ma'noli; boshqa holatda `null`, nol emas.
      averageHours: row.hours === null ? null : Math.round(row.hours * 10) / 10,
    }));

    const totals = sumOf(data, ['deliveries']);
    totals['delivered'] = num(data.find((row) => row['status'] === 'DELIVERED')?.['deliveries']);
    totals['failed'] = num(data.find((row) => row['status'] === 'FAILED')?.['deliveries']);

    return {
      columns: [
        { key: 'status', label: 'Holat', type: 'text' },
        { key: 'deliveries', label: 'Yetkazmalar', type: 'integer' },
        { key: 'averageHours', label: 'O‘rtacha vaqt (soat)', type: 'decimal' },
      ],
      rows: data,
      totals,
    };
  }

  // ------------------------------------------------------ 9. haydovchilar samaradorligi

  private async driverPerformance(filters: ReportFilters): Promise<Built> {
    const parts = [
      Prisma.sql`d."deletedAt" IS NULL`,
      Prisma.sql`d."driverId" IS NOT NULL`,
      ...this.range('d."createdAt"', filters),
      ...this.regionIs('d."shippingRegion"', filters),
    ];

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        fullName: string;
        assigned: number;
        delivered: number;
        failed: number;
        open: number;
      }[]
    >`
      SELECT dr.id, u."fullName",
             count(*)::int AS assigned,
             (count(*) FILTER (WHERE d.status = 'DELIVERED'))::int AS delivered,
             (count(*) FILTER (WHERE d.status = 'FAILED'))::int AS failed,
             (count(*) FILTER (WHERE d.status NOT IN ('DELIVERED', 'FAILED', 'CANCELLED')))::int AS open
      FROM deliveries d
      JOIN drivers dr ON dr.id = d."driverId"
      JOIN users u ON u.id = dr."userId"
      ${this.where(parts)}
      GROUP BY dr.id, u."fullName"
      ORDER BY delivered DESC, u."fullName"`;

    const data: Row[] = rows.map((row) => {
      const delivered = num(row.delivered);
      const failed = num(row.failed);

      return {
        driver: row.fullName,
        assigned: num(row.assigned),
        delivered,
        failed,
        open: num(row.open),
        // Faqat YAKUNLANGAN ishlardan: yo'ldagi yetkazma muvaffaqiyatsizlik emas.
        successRate: percent(delivered, delivered + failed),
      };
    });

    const totals = sumOf(data, ['assigned', 'delivered', 'failed', 'open']);
    totals['successRate'] = percent(
      totals['delivered'] ?? 0,
      (totals['delivered'] ?? 0) + (totals['failed'] ?? 0),
    );

    return {
      columns: [
        { key: 'driver', label: 'Haydovchi', type: 'text' },
        { key: 'assigned', label: 'Biriktirilgan', type: 'integer' },
        { key: 'delivered', label: 'Topshirilgan', type: 'integer' },
        { key: 'failed', label: 'Bajarilmagan', type: 'integer' },
        { key: 'open', label: 'Jarayonda', type: 'integer' },
        { key: 'successRate', label: 'Muvaffaqiyat', type: 'percent' },
      ],
      rows: data,
      totals,
    };
  }

  // ------------------------------------------------------------ 10. arizalar

  private async leadConversion(filters: ReportFilters): Promise<Built> {
    const parts = [
      Prisma.sql`l."deletedAt" IS NULL`,
      ...this.range('l."createdAt"', filters),
      ...this.regionIs('l.region', filters),
    ];

    const rows = await this.prisma.$queryRaw<{ status: string; leads: number }[]>`
      SELECT l.status::text AS status, count(*)::int AS leads
      FROM leads l
      ${this.where(parts)}
      GROUP BY l.status
      ORDER BY l.status`;

    const all = rows.reduce((sum, row) => sum + num(row.leads), 0);

    const data: Row[] = rows.map((row) => ({
      status: row.status,
      leads: num(row.leads),
      share: percent(num(row.leads), all),
    }));

    const converted = num(data.find((row) => row['status'] === 'CONVERTED')?.['leads']);

    return {
      columns: [
        { key: 'status', label: 'Holat', type: 'text' },
        { key: 'leads', label: 'Arizalar', type: 'integer' },
        { key: 'share', label: 'Ulushi', type: 'percent' },
      ],
      rows: data,
      totals: { leads: all, converted, conversionRate: percent(converted, all) },
    };
  }
}

function sumOf(rows: Row[], keys: string[]): Record<string, number> {
  return Object.fromEntries(
    keys.map((key) => [key, rows.reduce((sum, row) => sum + num(row[key]), 0)]),
  );
}
