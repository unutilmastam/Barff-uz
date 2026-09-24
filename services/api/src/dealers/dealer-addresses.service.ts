import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@barff/db';
import { AUDIT_ACTIONS } from '../audit/audit.actions';
import { AuditService } from '../audit/audit.service';
import { type RequestContext } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tahrirlash kiritmasi — `Partial` emas.
 *
 * `exactOptionalPropertyTypes` bilan `Partial<T>` "maydon yo'q"
 * degani, DTO esa "maydon bor va `undefined`" beradi.
 */
export type AddressUpdate = { [K in keyof AddressInput]?: AddressInput[K] | undefined };

export interface AddressInput {
  label: string;
  region: string;
  district?: string | undefined;
  city?: string | undefined;
  street: string;
  notes?: string | undefined;
  contactName: string;
  contactPhone: string;
  isDefault?: boolean | undefined;
}

/**
 * Diler yetkazib berish manzillari.
 *
 * HAR BIR amal `dealerId` ni TALAB qiladi va uni chaqiruvchi
 * `DealersService.requireActiveDealer()` dan oladi — so'rov
 * parametridan EMAS. Aks holda diler boshqa tashkilotning manzil
 * id sini yozib, uni o'qishi yoki o'chirishi mumkin bo'lardi.
 */
@Injectable()
export class DealerAddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(dealerId: string) {
    return this.prisma.dealerAddress.findMany({
      where: { dealerId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Manzil qo'shish.
   *
   * BIRINCHI manzil ALBATTA standart bo'ladi, foydalanuvchi buni
   * so'ramasa ham: aks holda diler buyurtma berganda standart manzil
   * topilmay, oqim yarim yo'lda to'xtardi.
   */
  async create(dealerId: string, input: AddressInput, actorId: string, ctx: RequestContext) {
    const count = await this.prisma.dealerAddress.count({
      where: { dealerId, deletedAt: null },
    });

    const isDefault = count === 0 ? true : (input.isDefault ?? false);

    const address = await this.prisma.$transaction(async (tx) => {
      if (isDefault) await clearDefault(tx, dealerId, null);

      return tx.dealerAddress.create({
        data: {
          dealerId,
          label: input.label,
          region: input.region,
          ...(input.district !== undefined ? { district: input.district } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          street: input.street,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          isDefault,
        },
      });
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_ADDRESS_CREATED,
      entity: 'dealer_address',
      entityId: address.id,
      actorId,
      after: { dealerId, label: address.label, isDefault },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return address;
  }

  async update(
    dealerId: string,
    id: string,
    input: AddressUpdate,
    actorId: string,
    ctx: RequestContext,
  ) {
    const existing = await this.requireOwn(dealerId, id);

    const data: Prisma.DealerAddressUpdateInput = {};
    for (const key of [
      'label',
      'region',
      'district',
      'city',
      'street',
      'notes',
      'contactName',
      'contactPhone',
    ] as const) {
      const value = input[key];
      if (value !== undefined) data[key] = value;
    }

    const address = await this.prisma.$transaction(async (tx) => {
      /*
        Standartni OLIB TASHLASH bu yerda qo'llab-quvvatlanmaydi:
        `isDefault: false` yuborilsa, dilerda standart manzil
        umuman qolmasdi. Boshqasini standart qilish — aynan shu
        amal, ya'ni yo'qotish emas, ko'chirish.
      */
      if (input.isDefault === true) {
        await clearDefault(tx, dealerId, id);
        data.isDefault = true;
      }

      return tx.dealerAddress.update({ where: { id }, data });
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_ADDRESS_UPDATED,
      entity: 'dealer_address',
      entityId: id,
      actorId,
      before: { label: existing.label, isDefault: existing.isDefault },
      after: { label: address.label, isDefault: address.isDefault },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });

    return address;
  }

  /**
   * Yumshoq o'chirish.
   *
   * Buyurtmalar manzilga havola qiladi (S26), shuning uchun qator
   * fizik o'chirilmaydi — aks holda eski buyurtma qayerga
   * yetkazilgani yo'qolardi.
   *
   * O'chirilgan manzil standart bo'lsa, standart qolganlarning eng
   * eskisiga o'tadi: diler standartsiz qolmaydi.
   */
  async remove(dealerId: string, id: string, actorId: string, ctx: RequestContext) {
    const existing = await this.requireOwn(dealerId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.dealerAddress.update({
        where: { id },
        data: { deletedAt: new Date(), isDefault: false },
      });

      if (existing.isDefault) {
        const next = await tx.dealerAddress.findFirst({
          where: { dealerId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

        if (next !== null) {
          await tx.dealerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.DEALER_ADDRESS_DELETED,
      entity: 'dealer_address',
      entityId: id,
      actorId,
      before: { dealerId, label: existing.label },
      ...(ctx.ip !== undefined ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent !== undefined ? { userAgent: ctx.userAgent } : {}),
    });
  }

  /**
   * Manzil SHU dilerga tegishlimi.
   *
   * Topilmagan va BOSHQA dilerniki — bir xil javob (404). Ajratilsa,
   * bu endpoint boshqa dilerlarning manzil id larini tekshirish
   * vositasiga aylanardi.
   */
  private async requireOwn(dealerId: string, id: string) {
    const address = await this.prisma.dealerAddress.findFirst({
      where: { id, dealerId, deletedAt: null },
    });

    if (address === null) {
      throw new NotFoundException({
        message: 'Manzil topilmadi',
        code: 'DEALER_ADDRESS_NOT_FOUND',
      });
    }

    return address;
  }
}

/** Boshqa barcha manzillardan standart belgisini olib tashlaydi. */
function clearDefault(tx: Prisma.TransactionClient, dealerId: string, exceptId: string | null) {
  return tx.dealerAddress.updateMany({
    where: {
      dealerId,
      isDefault: true,
      ...(exceptId !== null ? { id: { not: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}
