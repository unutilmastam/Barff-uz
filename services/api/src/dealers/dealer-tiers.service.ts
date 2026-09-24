import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

export interface TierInput {
  code: string;
  name: string;
  discountBasisPoints: number;
  minOrderAmount?: number | null | undefined;
  isActive?: boolean | undefined;
  displayOrder?: number | undefined;
}

/**
 * Tahrirlash kiritmasi.
 *
 * `Partial<TierInput>` YETARLI EMAS: `exactOptionalPropertyTypes`
 * yoqilgan, ya'ni `Partial` "maydon yo'q" degani bo'ladi, "maydon bor
 * va `undefined`" degani emas. DTO esa aynan ikkinchisini beradi.
 */
export type TierUpdate = { [K in keyof TierInput]?: TierInput[K] | undefined };

interface Actor {
  id: string;
  email: string;
}

/**
 * Diler darajalari — narx siyosatining asosi (S23).
 *
 * Daraja O'CHIRILMAYDI, faqat nofaol qilinadi: dilerlar unga havola
 * qiladi va buyurtmalar tarixi qaysi shartda berilganini saqlashi
 * kerak.
 */
@Injectable()
export class DealerTiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(includeInactive = false) {
    return this.prisma.dealerTier.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async create(input: TierInput, actor: Actor, ctx: RequestContext) {
    const existing = await this.prisma.dealerTier.findFirst({
      where: { code: input.code },
      select: { id: true },
    });

    if (existing !== null) {
      throw new ConflictException({
        message: 'Bu kod bilan daraja mavjud',
        code: 'DEALER_TIER_CODE_EXISTS',
      });
    }

    const tier = await this.prisma.dealerTier.create({
      data: {
        code: input.code,
        name: input.name,
        discountBasisPoints: input.discountBasisPoints,
        ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_TIER_CHANGED,
      entity: 'dealer_tier',
      entityId: tier.id,
      actorId: actor.id,
      actorEmail: actor.email,
      after: tier,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return tier;
  }

  async update(id: string, input: TierUpdate, actor: Actor, ctx: RequestContext) {
    const before = await this.prisma.dealerTier.findFirst({ where: { id, deletedAt: null } });

    if (before === null) {
      throw new NotFoundException({ message: 'Daraja topilmadi', code: 'DEALER_TIER_NOT_FOUND' });
    }

    if (input.code !== undefined && input.code !== before.code) {
      const clash = await this.prisma.dealerTier.findFirst({
        where: { code: input.code, id: { not: id } },
        select: { id: true },
      });

      if (clash !== null) {
        throw new ConflictException({
          message: 'Bu kod bilan daraja mavjud',
          code: 'DEALER_TIER_CODE_EXISTS',
        });
      }
    }

    const tier = await this.prisma.dealerTier.update({ where: { id }, data: toData(input) });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_TIER_CHANGED,
      entity: 'dealer_tier',
      entityId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      before,
      after: tier,
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return tier;
  }
}

function toData(input: TierUpdate): Prisma.DealerTierUpdateInput {
  const data: Prisma.DealerTierUpdateInput = {};

  if (input.code !== undefined) data.code = input.code;
  if (input.name !== undefined) data.name = input.name;
  if (input.discountBasisPoints !== undefined) data.discountBasisPoints = input.discountBasisPoints;
  if (input.minOrderAmount !== undefined) data.minOrderAmount = input.minOrderAmount;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;

  return data;
}
