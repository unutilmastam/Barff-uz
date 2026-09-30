import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Readable } from 'node:stream';
import { REPORT_KEYS, type ReportKey } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestWithUser } from '../auth/auth.request';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { createZodDto } from '../common/validation/zod-dto';
import { reportQuerySchema } from '@barff/validation';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';

class ReportQueryDto extends createZodDto(reportQuerySchema) {}

function toKey(value: string): ReportKey {
  if (!(REPORT_KEYS as readonly string[]).includes(value)) {
    throw new NotFoundException({ message: 'Hisobot topilmadi', code: 'REPORT_NOT_FOUND' });
  }

  return value as ReportKey;
}

function filtersOf(query: ReportQueryDto) {
  return {
    from: query.from,
    to: query.to,
    region: query.region,
    dealerId: query.dealerId,
    productId: query.productId,
  };
}

/**
 * Hisobotlar (CLAUDE.md §22).
 *
 * `reports.view` — ko'rish, `reports.export` — fayl olish. Ikkalasi
 * alohida: eksport ma'lumotni tizimdan CHIQARIB oladi va u
 * kuzatilishi kerak (audit'da yoziladi).
 */
@ApiTags('hisobotlar')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ReportExportService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Hisobotlar ro‘yxati va ularning filtrlari' })
  list() {
    return this.reports.list();
  }

  @Get(':key')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Hisobot (JSON)' })
  @ApiZodQuery(ReportQueryDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Filtr bu hisobotga tegishli emas' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Hisobot topilmadi' })
  run(@Param('key') key: string, @Query() query: ReportQueryDto) {
    return this.reports.run(toKey(key), filtersOf(query), { limit: query.limit });
  }

  @Get(':key/export.csv')
  @Permissions('reports.export')
  @ApiOperation({ summary: 'CSV eksport (OQIMLI, qatorlar soni cheklanmagan)' })
  async csv(
    @Param('key') key: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    const reportKey = toKey(key);
    const filters = filtersOf(query);

    // Filtr xatosi javob BOSHLANISHIDAN oldin: oqim boshlangach status o'zgartirib bo'lmaydi.
    this.reports.assertFilters(reportKey, filters);

    await this.recordExport(reportKey, 'csv', filters, user, request);

    return new StreamableFile(Readable.from(this.exporter.csv(reportKey, filters)), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${reportKey}.csv"`,
    });
  }

  @Get(':key/export.xlsx')
  @Permissions('reports.export')
  @ApiOperation({ summary: 'XLSX eksport (50 000 qatorgacha; kattasi CSV bilan)' })
  @ApiResponse({ status: 413, type: ApiErrorDto, description: 'Qatorlar XLSX uchun ko‘p' })
  async xlsx(
    @Param('key') key: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    const reportKey = toKey(key);
    const filters = filtersOf(query);

    // Avval fayl quriladi (413 shu yerda chiqadi), keyin audit yoziladi: rad etilgan eksport ma'lumotni chiqarmadi.
    const file = await this.exporter.xlsx(reportKey, filters);
    await this.recordExport(reportKey, 'xlsx', filters, user, request);

    return new StreamableFile(file, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${reportKey}.xlsx"`,
    });
  }

  private async recordExport(
    key: ReportKey,
    format: 'csv' | 'xlsx',
    filters: Record<string, string | undefined>,
    user: AuthenticatedUser,
    request: RequestWithUser,
  ): Promise<void> {
    const userAgent = request.headers['user-agent'];

    await this.audit.record({
      action: AUDIT_ACTIONS.REPORT_EXPORTED,
      entity: 'report',
      entityId: key,
      actorId: user.id,
      actorEmail: user.email,
      after: {
        format,
        filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)),
      },
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
    });
  }
}
