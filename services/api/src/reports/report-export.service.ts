import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { type ReportColumn, type ReportKey } from '@barff/types';
import { CSV_BOM, csvRow } from './export/csv';
import { MAX_XLSX_ROWS, type XlsxCell, buildXlsx } from './export/xlsx';
import { type ReportFilters, ReportsService } from './reports.service';

type Cell = string | number | null;

/** Bir vaqtda yoziladigan qatorlar soni. */
const CSV_CHUNK_ROWS = 1000;

/** Sarlavha — birlik OCHIQ yoziladi: tiyin so'm emas. */
export function headerLabel(column: ReportColumn): string {
  if (column.type === 'money') return `${column.label} (tiyin)`;
  if (column.type === 'percent') return `${column.label} (%)`;

  return column.label;
}

function cells(columns: readonly ReportColumn[], row: Record<string, Cell>): Cell[] {
  return columns.map((column) => row[column.key] ?? null);
}

/**
 * Hisobot eksporti (CLAUDE.md §22, S37).
 *
 * CSV — OQIMLI: javob bo'laklab yoziladi va xotirada bir vaqtda
 * faqat bitta bo'lak turadi. XLSX — xotirada quriladi va
 * `MAX_XLSX_ROWS` bilan cheklangan; undan kattasi CSV'ga
 * yo'naltiriladi (`docs/REPORTS-POLICY.md` §5).
 */
@Injectable()
export class ReportExportService {
  constructor(private readonly reports: ReportsService) {}

  /** Eksportga kirgan qatorlar soni — audit uchun. */
  async rowCount(key: ReportKey, filters: ReportFilters): Promise<number> {
    if (key === 'stock-movements') return this.reports.ledgerCount(filters);

    const result = await this.reports.run(key, filters, { unlimited: true });

    return result.rows.length;
  }

  /** CSV oqimi. Har bir `yield` — tayyor matn bo'lagi. */
  async *csv(key: ReportKey, filters: ReportFilters): AsyncGenerator<string> {
    if (key === 'stock-movements') {
      this.reports.assertFilters(key, filters);
      const columns = this.reports.ledgerColumns;

      yield CSV_BOM + csvRow(columns.map(headerLabel));

      for await (const batch of this.reports.ledgerBatches(filters)) {
        yield batch.map((row) => csvRow(cells(columns, row))).join('');
      }

      return;
    }

    const result = await this.reports.run(key, filters, { unlimited: true });

    yield CSV_BOM + csvRow(result.columns.map(headerLabel));

    for (let i = 0; i < result.rows.length; i += CSV_CHUNK_ROWS) {
      yield result.rows
        .slice(i, i + CSV_CHUNK_ROWS)
        .map((row) => csvRow(cells(result.columns, row)))
        .join('');
    }
  }

  async xlsx(key: ReportKey, filters: ReportFilters): Promise<Buffer> {
    if (key === 'stock-movements') {
      this.reports.assertFilters(key, filters);

      // Katta jurnalni yuklashdan OLDIN rad etiladi: yuklab bo'lgach rad etish xotirani bekorga band qilgan bo'lardi.
      const count = await this.reports.ledgerCount(filters);
      this.assertXlsxSize(count);

      const columns = this.reports.ledgerColumns;
      const rows: XlsxCell[][] = [];

      for await (const batch of this.reports.ledgerBatches(filters)) {
        for (const row of batch) rows.push(cells(columns, row));
      }

      return buildXlsx({ sheetName: 'Ombor harakatlari', header: columns.map(headerLabel), rows });
    }

    const result = await this.reports.run(key, filters, { unlimited: true });
    this.assertXlsxSize(result.rows.length);

    return buildXlsx({
      sheetName: result.title,
      header: result.columns.map(headerLabel),
      rows: result.rows.map((row) => cells(result.columns, row)),
    });
  }

  private assertXlsxSize(rows: number): void {
    if (rows > MAX_XLSX_ROWS) {
      throw new PayloadTooLargeException({
        message: `XLSX ${MAX_XLSX_ROWS} qatorgacha. Bu hisobotda ${rows} qator — CSV dan foydalaning (u cheklanmagan).`,
        code: 'REPORT_TOO_LARGE_FOR_XLSX',
      });
    }
  }
}
