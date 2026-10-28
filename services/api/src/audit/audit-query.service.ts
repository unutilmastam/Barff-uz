import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { dayEndExclusiveUtc, dayStartUtc } from '../reports/reports.service';

export interface AuditFilters {
  from?: string | undefined;
  to?: string | undefined;
  action?: string | undefined;
  actionPrefix?: string | undefined;
  entity?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  actor?: string | undefined;
  requestId?: string | undefined;
}

const SELECT = {
  id: true,
  createdAt: true,
  action: true,
  entity: true,
  entityId: true,
  actorId: true,
  actorEmail: true,
  before: true,
  after: true,
  ip: true,
  userAgent: true,
  requestId: true,
} satisfies Prisma.AuditLogSelect;

/**
 * Audit jurnalini O'QISH (CLAUDE.md §23).
 *
 * Yozish `AuditService` da. Ikkita alohida servis ataylab: o'qish
 * tomoni murakkab (filtr, eksport), yozish tomoni esa har bir modulga
 * kiritiladi va HECH QACHON asosiy amalni to'xtatmasligi kerak — uni
 * so'rov logikasi bilan aralashtirmaslik uchun.
 *
 * JURNAL TAHRIRLANMAYDI: bu servisda yozuvni o'zgartiradigan yoki
 * o'chiradigan metod YO'Q, bazada esa UPDATE trigger bilan to'silgan.
 */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  where(filters: AuditFilters): Prisma.AuditLogWhereInput {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from !== undefined) createdAt.gte = dayStartUtc(filters.from);
    if (filters.to !== undefined) createdAt.lt = dayEndExclusiveUtc(filters.to);

    return {
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      ...(filters.action !== undefined ? { action: filters.action } : {}),
      ...(filters.actionPrefix !== undefined
        ? { action: { startsWith: `${filters.actionPrefix}.` } }
        : {}),
      ...(filters.entity !== undefined ? { entity: filters.entity } : {}),
      ...(filters.entityId !== undefined ? { entityId: filters.entityId } : {}),
      ...(filters.actorId !== undefined ? { actorId: filters.actorId } : {}),
      ...(filters.actor !== undefined
        ? { actorEmail: { contains: filters.actor, mode: 'insensitive' as const } }
        : {}),
      ...(filters.requestId !== undefined ? { requestId: filters.requestId } : {}),
    };
  }

  async list(filters: AuditFilters, page: { page: number; limit: number }) {
    const request = toPageRequest({ ...page, sortOrder: 'desc' });
    const where = this.where(filters);

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: SELECT,
        // `id` ikkinchi kalit: bir millisekundda yozilgan qatorlar tartibi barqaror bo'lsin.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findOne(id: string) {
    const row = await this.prisma.auditLog.findUnique({ where: { id }, select: SELECT });

    if (row === null) {
      throw new NotFoundException({ message: 'Audit yozuvi topilmadi', code: 'AUDIT_NOT_FOUND' });
    }

    return row;
  }

  /** Filtr ro'yxatlari uchun: jurnalda HAQIQATAN uchragan amal va sohalar. */
  async facets() {
    const [actions, entities] = await Promise.all([
      this.prisma.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        distinct: ['entity'],
        select: { entity: true },
        orderBy: { entity: 'asc' },
      }),
    ]);

    return {
      actions: actions.map((row) => row.action),
      entities: entities.map((row) => row.entity),
    };
  }

  /**
   * Eksport uchun partiyalar. Xotirada bir vaqtda BITTA bo'lak
   * (hisobot eksporti bilan bir xil usul, `reports.service.ts`).
   */
  async *batches(filters: AuditFilters, batchSize = 1000) {
    const where = this.where(filters);
    let cursorId: string | undefined;

    for (;;) {
      const batch = await this.prisma.auditLog.findMany({
        where,
        select: SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: batchSize,
        ...(cursorId !== undefined ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });

      if (batch.length === 0) return;
      yield batch;

      const last = batch[batch.length - 1];
      if (batch.length < batchSize || last === undefined) return;
      cursorId = last.id;

      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
}
