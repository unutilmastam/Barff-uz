import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type BusinessType, type LeadStatus, type Prisma } from '@barff/db';
import { canTransitionLead } from '@barff/types';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface LeadSubmission {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string | undefined;
  region: string;
  businessType: BusinessType;
  desiredProducts?: string | undefined;
  estimatedMonthlyVolume?: number | undefined;
  message?: string | undefined;
}

interface Actor {
  id: string;
  email: string;
}

@Injectable()
export class LeadsService {
  /**
   * Takroriy ariza oynasi.
   *
   * Bir xil kompaniya+telefon shu vaqt ichida qayta yuborsa, YANGI
   * yozuv yaratilmaydi. Tashrifchiga xato ko'rsatilmaydi: u formani
   * ikki marta bosgan bo'lishi mumkin va "xato" uni chalg'itardi.
   */
  private static readonly DEDUPE_WINDOW_MINUTES = 30;

  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Telefon raqamidan barqaror kalit quradi.
   *
   * `+998 90 123-45-67` va `998901234567` — bitta odam. Formatlash
   * farqi takroriy arizani "yangi" qilib ko'rsatmasligi kerak.
   */
  static dedupeKey(companyName: string, phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const company = companyName.trim().toLowerCase().replace(/\s+/g, ' ');

    return `${company}|${digits}`;
  }

  async submit(input: LeadSubmission, ctx: RequestContext) {
    const dedupeKey = LeadsService.dedupeKey(input.companyName, input.phone);
    const since = new Date(Date.now() - LeadsService.DEDUPE_WINDOW_MINUTES * 60_000);

    const recent = await this.prisma.lead.findFirst({
      where: { dedupeKey, createdAt: { gte: since }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (recent !== null) {
      // Takror: mavjud yozuv qaytadi, yangi bildirishnoma YUBORILMAYDI.
      this.logger.log(`Takroriy ariza e'tiborsiz qoldirildi: ${recent.id}`);

      return { id: recent.id, duplicate: true };
    }

    const lead = await this.prisma.lead.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        phone: input.phone,
        ...(input.email !== undefined ? { email: input.email } : {}),
        region: input.region,
        businessType: input.businessType,
        ...(input.desiredProducts !== undefined ? { desiredProducts: input.desiredProducts } : {}),
        ...(input.estimatedMonthlyVolume !== undefined
          ? { estimatedMonthlyVolume: input.estimatedMonthlyVolume }
          : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
        dedupeKey,
        ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
        ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
        events: { create: { toStatus: 'NEW' } },
      },
    });

    // Bildirishnoma YUBORILMASA ham ariza saqlangan — shuning uchun
    // xato yuqoriga chiqmaydi (NotificationsService o'zi yutadi).
    await this.notifications.notify({
      event: 'lead.created',
      subject: `Yangi B2B ariza: ${lead.companyName}`,
      body: [
        `Kompaniya: ${lead.companyName}`,
        `Kontakt: ${lead.contactName}`,
        `Telefon: ${lead.phone}`,
        `Hudud: ${lead.region}`,
        `Turi: ${lead.businessType}`,
      ].join('\n'),
      payload: { leadId: lead.id },
      ...(await this.notificationTargets()),
    });

    return { id: lead.id, duplicate: false };
  }

  /**
   * Bildirishnoma kimga ketadi.
   *
   * Manzillar sozlamadan (`notifications.lead`) keladi — kodda
   * qattiq yozilmaydi (Q12). Sotuvchilar in-app bildirishnoma oladi.
   */
  private async notificationTargets(): Promise<{
    addresses?: Record<string, string>;
    recipientIds?: string[];
  }> {
    const [setting, salesUsers] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'notifications.lead' } }),
      this.prisma.user.findMany({
        where: { isActive: true, deletedAt: null, roles: { some: { role: { code: 'SALES' } } } },
        select: { id: true },
      }),
    ]);

    const value = (setting?.value ?? {}) as Record<string, unknown>;
    const addresses: Record<string, string> = {};

    for (const [channel, key] of [
      ['TELEGRAM', 'telegramChatId'],
      ['EMAIL', 'email'],
    ] as const) {
      const address = value[key];
      // `REPLACE_WITH_REAL_DATA` — sozlanmagan degani.
      if (typeof address === 'string' && address.length > 0 && !address.startsWith('REPLACE_')) {
        addresses[channel] = address;
      }
    }

    return {
      ...(Object.keys(addresses).length > 0 ? { addresses } : {}),
      ...(salesUsers.length > 0 ? { recipientIds: salesUsers.map((user) => user.id) } : {}),
    };
  }

  // ===========================================================================
  // ADMIN
  // ===========================================================================

  async list(query: { page: number; limit: number; status?: LeadStatus | undefined }) {
    const request = toPageRequest(query);
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    if (lead === null) {
      throw new NotFoundException({ message: 'Ariza topilmadi', code: 'LEAD_NOT_FOUND' });
    }

    return lead;
  }

  /**
   * Holatni o'zgartirish.
   *
   * O'tish qoidalari `@barff/types` da — bir joyda. `CONVERTED` dan
   * keyin yo'l yo'q: bitim yopilgan lead qayta ochilmaydi, yangi
   * murojaat yangi ariza bo'ladi.
   */
  async changeStatus(
    id: string,
    to: LeadStatus,
    note: string | undefined,
    actor: Actor,
    ctx: RequestContext,
  ) {
    const lead = await this.findOne(id);

    if (lead.status === to) {
      throw new BadRequestException({
        message: 'Ariza allaqachon shu holatda',
        code: 'LEAD_STATUS_UNCHANGED',
      });
    }

    if (!canTransitionLead(lead.status, to)) {
      throw new BadRequestException({
        message: `\`${lead.status}\` holatidan \`${to}\` ga o'tib bo'lmaydi`,
        code: 'LEAD_STATUS_INVALID_TRANSITION',
      });
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: to,
        events: {
          create: {
            fromStatus: lead.status,
            toStatus: to,
            ...(note !== undefined ? { note } : {}),
            actorId: actor.id,
          },
        },
      },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.LEAD_STATUS_CHANGED,
      entity: 'Lead',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { status: lead.status },
      after: { status: to },
      ...ctx,
    });

    return updated;
  }
}
