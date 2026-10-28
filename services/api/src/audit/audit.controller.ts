import { Controller, Get, Param, ParseUUIDPipe, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Readable } from 'node:stream';
import { auditQuerySchema } from '@barff/validation';
import { type RequestWithUser } from '../auth/auth.request';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { createZodDto } from '../common/validation/zod-dto';
import { CSV_BOM, csvRow } from '../reports/export/csv';
import { AUDIT_ACTIONS } from './audit.actions';
import { AuditQueryService, type AuditFilters } from './audit-query.service';
import { AuditService } from './audit.service';

class AuditQueryDto extends createZodDto(auditQuerySchema) {}

function filtersOf(query: AuditQueryDto): AuditFilters {
  return {
    from: query.from,
    to: query.to,
    action: query.action,
    actionPrefix: query.actionPrefix,
    entity: query.entity,
    entityId: query.entityId,
    actorId: query.actorId,
    actor: query.actor,
    requestId: query.requestId,
  };
}

const CSV_HEADER = [
  'Vaqt (UTC)',
  'Bajaruvchi',
  'Amal',
  'Obyekt',
  'Obyekt ID',
  'IP',
  'So‘rov ID',
  'Oldin',
  'Keyin',
] as const;

function json(value: unknown): string {
  return value === null || value === undefined ? '' : JSON.stringify(value);
}

/**
 * Audit jurnali (CLAUDE.md §23).
 *
 * Faqat O'QISH. Jurnalni o'zgartiradigan yoki o'chiradigan endpoint
 * YO'Q va bo'lmasligi kerak; bazada ham UPDATE trigger bilan to'silgan.
 *
 * `audit.view` — ko'rish va eksport. Eksportning o'zi ham jurnalga
 * yoziladi: jurnalni kim olib chiqqani ham sezgir ma'lumot.
 */
@ApiTags('audit')
@Controller('admin/audit')
export class AuditController {
  constructor(
    private readonly query: AuditQueryService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Permissions('audit.view')
  @ApiOperation({ summary: 'Audit jurnali (filtr + sahifalash)' })
  @ApiZodQuery(AuditQueryDto)
  list(@Query() query: AuditQueryDto) {
    return this.query.list(filtersOf(query), { page: query.page, limit: query.limit });
  }

  /** `:id` dan OLDIN turishi SHART: aks holda `facets` ni `:id` deb qabul qiladi. */
  @Get('facets')
  @Permissions('audit.view')
  @ApiOperation({ summary: 'Filtr ro‘yxatlari: jurnalda uchragan amal va sohalar' })
  facets() {
    return this.query.facets();
  }

  @Get('export.csv')
  @Permissions('audit.view')
  @ApiOperation({ summary: 'CSV eksport (OQIMLI, qatorlar soni cheklanmagan)' })
  @ApiZodQuery(AuditQueryDto)
  async csv(
    @Query() query: AuditQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    const filters = filtersOf(query);
    const userAgent = request.headers['user-agent'];

    await this.audit.record({
      action: AUDIT_ACTIONS.AUDIT_EXPORTED,
      entity: 'audit',
      actorId: user.id,
      actorEmail: user.email,
      after: { format: 'csv', filters },
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    });

    const batches = this.query.batches(filters);

    async function* rows(): AsyncGenerator<string> {
      yield CSV_BOM + csvRow(CSV_HEADER);

      for await (const batch of batches) {
        yield batch
          .map((row) =>
            csvRow([
              row.createdAt.toISOString(),
              row.actorEmail,
              row.action,
              row.entity,
              row.entityId,
              row.ip,
              row.requestId,
              json(row.before),
              json(row.after),
            ]),
          )
          .join('');
      }
    }

    return new StreamableFile(Readable.from(rows()), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="audit.csv"',
    });
  }

  @Get(':id')
  @Permissions('audit.view')
  @ApiOperation({ summary: 'Bitta audit yozuvi (oldin/keyin bilan)' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.query.findOne(id);
  }
}
