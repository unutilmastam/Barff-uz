import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@barff/db';
import { PrismaService } from '../prisma/prisma.service';
import { redact } from '../common/logger/redact';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  actorId?: string;
  actorEmail?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Sezgir amallar jurnali (CLAUDE.md §23).
 *
 * Yozuv asosiy amalni HECH QACHON to'xtatmaydi: jurnalga yozish xatosi
 * kirishni yoki buyurtma holatini o'zgartirishni bekor qilmasligi kerak.
 * Shuning uchun xato ushlanadi va faqat logga chiqadi.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          actorId: entry.actorId ?? null,
          actorEmail: entry.actorEmail ?? null,
          // Parol va token maydonlari jurnalga TUSHMAYDI (CLAUDE.md §23).
          before: toJson(entry.before),
          after: toJson(entry.after),
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          requestId: entry.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Audit yozuvi saqlanmadi: ${entry.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

/**
 * Prisma'da `null` va "JSON null" farqlanadi: ustunni bo'sh qoldirish uchun
 * `Prisma.DbNull` kerak, oddiy `null` esa tip xatosiga olib keladi.
 */
function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  return redact(value) as Prisma.InputJsonValue;
}
