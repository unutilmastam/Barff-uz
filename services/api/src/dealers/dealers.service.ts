import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type DealerStatus } from '@barff/db';
import { canTransitionDealer, isDealerActive } from '@barff/types';
import { type DealerRegisterOutput } from '@barff/validation';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { paginate, toPageRequest } from '../common/dto/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  email: string;
}

/**
 * Dilerga QAYTARILADIGAN maydonlar.
 *
 * `internalNote` bu yerda ATAYLAB yo'q: u xodimlar uchun. Ro'yxatni
 * bitta joyda saqlash — maydon qo'shilganda uni dilerga oshkor qilib
 * yuborish xavfini kamaytiradi.
 */
const DEALER_SELF_SELECT = {
  id: true,
  companyName: true,
  taxId: true,
  region: true,
  businessType: true,
  status: true,
  statusReason: true,
  creditLimit: true,
  createdAt: true,
  reviewedAt: true,
  tier: { select: { id: true, code: true, name: true, discountBasisPoints: true } },
} as const;

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ===========================================================================
  // RO'YXATDAN O'TISH (ommaviy)
  // ===========================================================================

  /**
   * Diler arizasi: akkaunt + tashkilot BIRGA yaratiladi.
   *
   * Ikkalasi BITTA tranzaksiyada: akkaunt yaratilib, diler yozuvi
   * yaratilmay qolsa, foydalanuvchi kira oladigan, lekin hech qayerga
   * tegishli bo'lmagan "yetim" akkaunt qolardi.
   *
   * Akkaunt DARHOL `DEALER` rolini oladi, lekin bu kirish huquqini
   * BERMAYDI: diler endpoint'lari `status === APPROVED` ni talab
   * qiladi (`requireActiveDealer`). Rol arizaning holatini ko'rish
   * uchun kerak.
   */
  async register(input: DealerRegisterOutput, ctx: RequestContext) {
    const email = input.email.toLowerCase();

    /*
      TELEFON HAM `@unique` — va u TEKSHIRILMASDAN qolgan edi.

      Bu S29 da o'lchab topildi: ikkinchi ariza o'sha telefon bilan
      kelganda `tx.user.create()` `P2002` bilan yiqildi va endpoint
      `500` qaytardi. Ya'ni bitta ofisdan ikkinchi odam ariza
      yuborsa, u "server xatosi" ko'rardi va nima qilishni bilmasdi.
    */
    const [existingUser, existingPhone, existingTaxId] = await Promise.all([
      this.prisma.user.findFirst({ where: { email }, select: { id: true } }),
      this.prisma.user.findFirst({ where: { phone: input.phone }, select: { id: true } }),
      input.taxId !== undefined
        ? this.prisma.dealer.findFirst({ where: { taxId: input.taxId }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    /*
      Email yoki telefon band bo'lsa ham javob BIR XIL.

      Aks holda bu endpoint akkaunt mavjudligini tekshirish vositasiga
      aylanardi: kim qaysi email bilan ro'yxatdan o'tganini aniqlash
      mumkin bo'lardi. Ariza "qabul qilindi" deb ko'rsatiladi, lekin
      yangi yozuv YARATILMAYDI.

      Telefon ham AYNAN shu sababga ko'ra jim yutiladi: "bu raqam
      band" javobi kimning raqami ro'yxatda borligini oshkor qilardi.
    */
    if (existingUser !== null || existingPhone !== null) {
      this.logger.log(
        `Diler arizasi: ${existingUser !== null ? 'email' : 'telefon'} allaqachon band (${email})`,
      );
      return { accepted: true };
    }

    // STIR esa BOSHQA gap: u ommaviy ma'lumot (soliq reestrida ochiq)
    // va takrorlanishi haqiqiy xato — bir tashkilot ikki marta
    // ro'yxatdan o'tmoqchi. Buni jim yutish dilerni chalg'itardi.
    if (existingTaxId !== null) {
      throw new ConflictException({
        message: 'Bu STIR bilan ariza allaqachon mavjud',
        code: 'DEALER_TAX_ID_EXISTS',
      });
    }

    const passwordHash = await this.passwords.hash(input.password);

    /*
      POYGA HIMOYASI.

      Yuqoridagi tekshiruv bilan `create` orasida oyna bor: ikkita
      ariza BIR VAQTDA kelsa, ikkalasi ham "band emas" deb ko'radi va
      ikkinchisi `P2002` bilan yiqiladi. Tekshiruvning o'zi yetarli
      emas — javob shakli bir xil bo'lishi kerak.
    */
    const dealer = await this.createDealerAccount(input, email, passwordHash);

    if (dealer === null) {
      this.logger.log(`Diler arizasi: poygada band bo'ldi (${email})`);
      return { accepted: true };
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_REGISTERED,
      entity: 'dealer',
      entityId: dealer.id,
      after: { companyName: dealer.companyName, region: dealer.region },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifications.notify({
      event: 'dealer.registered',
      subject: `Yangi diler arizasi: ${dealer.companyName}`,
      body: [
        `Kompaniya: ${dealer.companyName}`,
        `Hudud: ${dealer.region}`,
        `Turi: ${dealer.businessType}`,
        `Kontakt: ${input.contactName} — ${input.phone}`,
      ].join('\n'),
      payload: { dealerId: dealer.id },
      ...(await this.notificationTargets()),
    });

    return { accepted: true };
  }

  /**
   * Akkaunt + tashkilotni BITTA tranzaksiyada yaratadi.
   *
   * `null` qaytsa — email yoki telefon poygada band bo'ldi. Chaqiruvchi
   * buni "qabul qilindi" deb ko'rsatadi, chunki aks holda javob
   * akkaunt bor-yo'qligini oshkor qilardi.
   *
   * STIR esa JIM YUTILMAYDI: u ommaviy ma'lumot va takrorlanishi
   * haqiqiy xato, ya'ni yuqoridagi tekshiruv bilan bir xil `409`
   * qaytadi. Barcha `P2002` larni bir xil ko'rib chiqish shu
   * shartnomani JIMGINA buzardi — ariza "qabul qilindi" deb
   * ko'rinib, hech qachon paydo bo'lmasdi.
   */
  private async createDealerAccount(
    input: DealerRegisterOutput,
    email: string,
    passwordHash: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            phone: input.phone,
            passwordHash,
            fullName: input.contactName,
            // Akkaunt FAOL: diler o'z arizasi holatini ko'rishi kerak.
            isActive: true,
            roles: { create: { role: { connect: { code: 'DEALER' } } } },
          },
          select: { id: true },
        });

        return tx.dealer.create({
          data: {
            userId: user.id,
            companyName: input.companyName,
            ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
            region: input.region,
            businessType: input.businessType,
            status: 'PENDING',
            events: { create: { toStatus: 'PENDING', note: input.message ?? null } },
          },
          select: { id: true, companyName: true, region: true, businessType: true },
        });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      /*
        Qaysi cheklov buzilgani `meta.target` da. Prisma uni turli
        shaklda beradi (maydon nomlari massivi yoki cheklov nomi),
        shuning uchun matn sifatida qaraladi.
      */
      const target = JSON.stringify(error.meta?.['target'] ?? '');

      if (target.includes('taxId') || target.includes('tax_id')) {
        throw new ConflictException({
          message: 'Bu STIR bilan ariza allaqachon mavjud',
          code: 'DEALER_TAX_ID_EXISTS',
        });
      }

      if (target.includes('email') || target.includes('phone')) return null;

      // Boshqa har qanday takrorlanish — kutilmagan holat, yashirilmaydi.
      throw error;
    }
  }

  /**
   * Bildirishnoma kimga ketadi.
   *
   * Lead oqimidagi kabi: manzillar sozlamadan, kodda qattiq
   * yozilmaydi (Q12). Arizani ko'radigan xodimlar in-app oladi.
   */
  private async notificationTargets(): Promise<{
    addresses?: Record<string, string>;
    recipientIds?: string[];
  }> {
    const [setting, reviewers] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'notifications.dealer' } }),
      this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          roles: {
            some: {
              role: { permissions: { some: { permission: { code: 'dealers.approve' } } } },
            },
          },
        },
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
      if (typeof address === 'string' && address.length > 0 && !address.startsWith('REPLACE_')) {
        addresses[channel] = address;
      }
    }

    return {
      ...(Object.keys(addresses).length > 0 ? { addresses } : {}),
      ...(reviewers.length > 0 ? { recipientIds: reviewers.map((user) => user.id) } : {}),
    };
  }

  // ===========================================================================
  // DILERNING O'ZI
  // ===========================================================================

  /**
   * Foydalanuvchining diler yozuvi.
   *
   * Har bir diler endpoint'i shu yerdan boshlanadi: `dealerId` NIKAH
   * so'rovdan olinmaydi. Agar u parametr bo'lsa, diler boshqa
   * tashkilotning id sini yozib, uning ma'lumotini so'rashi mumkin
   * bo'lardi (IDOR).
   */
  async requireDealer(userId: string) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (dealer === null) {
      throw new ForbiddenException({
        message: "Sizda diler akkaunti yo'q",
        code: 'DEALER_NOT_FOUND',
      });
    }

    return dealer;
  }

  /**
   * Tasdiqlangan diler talab qilinadi.
   *
   * Tekshiruv SERVERDA: panelda tugmani yashirish yetarli emas
   * (CLAUDE.md §3). Sabab javobda ko'rsatiladi — diler nima
   * kutayotganini bilishi kerak.
   */
  async requireActiveDealer(userId: string) {
    const dealer = await this.requireDealer(userId);

    if (!isDealerActive(dealer.status)) {
      throw new ForbiddenException({
        message:
          dealer.status === 'PENDING'
            ? "Arizangiz ko'rib chiqilmoqda"
            : 'Diler akkauntingiz faol emas',
        code: 'DEALER_NOT_ACTIVE',
      });
    }

    return dealer;
  }

  /** Diler o'z profilini ko'radi (holati bilan birga). */
  async findSelf(userId: string) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { userId, deletedAt: null },
      select: {
        ...DEALER_SELF_SELECT,
        user: { select: { fullName: true, email: true, phone: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
        },
      },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    return dealer;
  }

  /** Diler o'z profilini tahrirlaydi. Holat va shartlarga TEGMAYDI. */
  async updateSelf(
    userId: string,
    input: {
      companyName?: string | undefined;
      taxId?: string | undefined;
      region?: string | undefined;
      contactName?: string | undefined;
      phone?: string | undefined;
    },
    ctx: RequestContext,
  ) {
    const dealer = await this.requireDealer(userId);

    if (input.taxId !== undefined) {
      const clash = await this.prisma.dealer.findFirst({
        where: { taxId: input.taxId, id: { not: dealer.id } },
        select: { id: true },
      });

      if (clash !== null) {
        throw new ConflictException({
          message: 'Bu STIR boshqa dilerga tegishli',
          code: 'DEALER_TAX_ID_EXISTS',
        });
      }
    }

    const data: Prisma.DealerUpdateInput = {};
    if (input.companyName !== undefined) data.companyName = input.companyName;
    if (input.taxId !== undefined) data.taxId = input.taxId;
    if (input.region !== undefined) data.region = input.region;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.contactName !== undefined || input.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(input.contactName !== undefined ? { fullName: input.contactName } : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
          },
        });
      }

      return tx.dealer.update({
        where: { id: dealer.id },
        data,
        select: DEALER_SELF_SELECT,
      });
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_UPDATED,
      entity: 'dealer',
      entityId: dealer.id,
      actorId: userId,
      after: input,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }

  // ===========================================================================
  // ADMIN
  // ===========================================================================

  async list(query: {
    page: number;
    limit: number;
    status?: DealerStatus | undefined;
    search?: string | undefined;
  }) {
    const request = toPageRequest(query);

    const where: Prisma.DealerWhereInput = {
      deletedAt: null,
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.search !== undefined && query.search.length > 0
        ? {
            OR: [
              { companyName: { contains: query.search, mode: 'insensitive' } },
              { taxId: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.dealer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: request.skip,
        take: request.take,
        select: {
          ...DEALER_SELF_SELECT,
          internalNote: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      }),
      this.prisma.dealer.count({ where }),
    ]);

    return paginate(items, total, request);
  }

  async findOne(id: string) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...DEALER_SELF_SELECT,
        internalNote: true,
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        addresses: {
          where: { deletedAt: null },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        events: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            actor: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    return dealer;
  }

  /**
   * Holatni o'zgartirish — tasdiqlash, rad etish, to'xtatish.
   *
   * O'tish jadvali `@barff/types` da va SERVER ham, panel ham o'shani
   * ishlatadi. Shuning uchun panel ko'rsatgan tugmani server rad
   * etmaydi va aksincha — panel taqiqlagan o'tishni to'g'ridan-to'g'ri
   * `fetch` bilan ham bajarib bo'lmaydi.
   */
  async setStatus(
    id: string,
    input: { status: DealerStatus; reason?: string | undefined; internalNote?: string | undefined },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, userId: true, companyName: true },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    if (dealer.status === input.status) {
      throw new BadRequestException({
        message: 'Diler allaqachon shu holatda',
        code: 'DEALER_STATUS_UNCHANGED',
      });
    }

    if (!canTransitionDealer(dealer.status, input.status)) {
      throw new BadRequestException({
        message: `${dealer.status} dan ${input.status} ga o'tish mumkin emas`,
        code: 'DEALER_STATUS_INVALID_TRANSITION',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.dealer.update({
        where: { id },
        data: {
          status: input.status,
          statusReason: input.reason ?? null,
          ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        select: DEALER_SELF_SELECT,
      });

      await tx.dealerEvent.create({
        data: {
          dealerId: id,
          fromStatus: dealer.status,
          toStatus: input.status,
          note: input.reason ?? null,
          actorId: actor.id,
        },
      });

      return row;
    });

    /*
      KESH TOZALASH BU YERDA KERAK EMAS — va buni O'LCHAB tekshirdim.

      `UsersService` foydalanuvchini 60 soniya keshlaydi, lekin keshda
      FAQAT rol va ruxsatlar turadi. Diler holati esa `requireDealer()`
      da har safar bazadan o'qiladi, ya'ni to'xtatish DARHOL kuchga
      kiradi.

      Avval bu yerda `users.invalidate()` chaqirig'i va "usiz diler
      kesh muddati tugaguncha ishlayverardi" degan izoh bor edi. Uni
      o'chirib testni qayta yurgizdim — 22 tadan 22 tasi baribir
      o'tdi, ya'ni chaqiruv hech narsa qilmasdi va izoh NOTO'G'RI edi.
      Ishlamaydigan kodni to'g'ri ishlayotgandek ko'rsatuvchi izoh
      bilan qoldirish — keyinchalik kimdir unga TAYANISHI demakdir.

      Rol o'zgarsa kesh tozalanadi, lekin u BOSHQA joyda
      (`UserRolesService.setRoles`).
    */

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_STATUS_CHANGED,
      entity: 'dealer',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { status: dealer.status },
      after: { status: input.status, reason: input.reason ?? null },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    await this.notifications.notify({
      event: 'dealer.status.changed',
      subject: `Diler holati: ${dealer.companyName} → ${input.status}`,
      body:
        input.status === 'APPROVED'
          ? 'Arizangiz tasdiqlandi. Endi buyurtma berishingiz mumkin.'
          : `Holat: ${input.status}.${input.reason !== undefined ? ` Sabab: ${input.reason}` : ''}`,
      payload: { dealerId: id, status: input.status },
      recipientIds: [dealer.userId],
    });

    return updated;
  }

  /** Shartlar: daraja va kredit limiti. Faqat admin. */
  async setTerms(
    id: string,
    input: {
      tierId?: string | null | undefined;
      creditLimit?: number | null | undefined;
      internalNote?: string | undefined;
    },
    actor: Actor,
    ctx: RequestContext,
  ) {
    const dealer = await this.prisma.dealer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, tierId: true, creditLimit: true },
    });

    if (dealer === null) {
      throw new NotFoundException({ message: 'Diler topilmadi', code: 'DEALER_NOT_FOUND' });
    }

    if (typeof input.tierId === 'string') {
      const tier = await this.prisma.dealerTier.findFirst({
        where: { id: input.tierId, deletedAt: null, isActive: true },
        select: { id: true },
      });

      if (tier === null) {
        throw new BadRequestException({
          message: 'Daraja topilmadi yoki faol emas',
          code: 'DEALER_TIER_NOT_FOUND',
        });
      }
    }

    const data: Prisma.DealerUpdateInput = {};
    if (input.tierId !== undefined) {
      data.tier = input.tierId === null ? { disconnect: true } : { connect: { id: input.tierId } };
    }
    if (input.creditLimit !== undefined) data.creditLimit = input.creditLimit;
    if (input.internalNote !== undefined) data.internalNote = input.internalNote;

    const updated = await this.prisma.dealer.update({
      where: { id },
      data,
      select: DEALER_SELF_SELECT,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_TERMS_CHANGED,
      entity: 'dealer',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before: { tierId: dealer.tierId, creditLimit: dealer.creditLimit },
      after: { tierId: updated.tier?.id ?? null, creditLimit: updated.creditLimit },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return updated;
  }
}
