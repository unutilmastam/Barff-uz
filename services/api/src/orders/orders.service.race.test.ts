import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OrdersService } from './orders.service';

/**
 * Poyga: ikki so'rov BIR VAQTDA bir xil `idempotencyKey` bilan keladi.
 *
 * G'olib so'rov buyurtmani yaratib savatni bo'shatadi. Yutqazgan so'rov
 * takror tekshiruvdan o'tib bo'lgach savatni o'qisa — u BO'SH savat
 * ko'radi. E2E testda bu vaqtga bog'liq (ba'zan o'tadi, ba'zan yiqiladi),
 * shuning uchun bu yerda ketma-ketlik QO'LDA qurilgan va deterministik.
 */
const winner = { id: 'order-1', number: 'ORD-2026-000001' };

function build(options: { keyLookups: (unknown | null)[]; lines: unknown[] }) {
  const lookups = [...options.keyLookups];
  const findFirst = vi.fn(async () => lookups.shift() ?? null);

  const prisma = { order: { findFirst } };
  const cart = { view: vi.fn(async () => ({ lines: options.lines })) };

  // Bu testda ishlatilmaydigan bog'liqliklar bo'sh.
  const service = new OrdersService(
    prisma as never,
    cart as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, findFirst, cart };
}

const input = { addressId: 'addr-1', idempotencyKey: 'key-1' };
const ctx = { ip: '127.0.0.1' };

describe('OrdersService.submit — poyga', () => {
  it('bo‘sh savat + g‘olib buyurtma mavjud: 400 emas, o‘sha buyurtma qaytadi', async () => {
    // 1-qidiruv (savatdan oldin): hali yo'q. 2-qidiruv (bo'sh savatdan keyin): g'olib paydo bo'ldi.
    const { service, findFirst } = build({ keyLookups: [null, winner], lines: [] });

    const result = await service.submit('dealer-1', input, ctx);

    expect(result).toMatchObject({ number: winner.number, duplicate: true });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('bo‘sh savat va g‘olib YO‘Q: haqiqatan CART_EMPTY', async () => {
    const { service } = build({ keyLookups: [null, null], lines: [] });

    await expect(service.submit('dealer-1', input, ctx)).rejects.toMatchObject({
      response: { code: 'CART_EMPTY' },
    });
  });

  it('kalitsiz yuborishda qo‘shimcha qidiruv YO‘Q va bo‘sh savat 400 beradi', async () => {
    const { service, findFirst } = build({ keyLookups: [], lines: [] });

    await expect(service.submit('dealer-1', { addressId: 'addr-1' }, ctx)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('savatdan oldin topilgan takror savatni umuman o‘qimaydi', async () => {
    const { service, cart } = build({ keyLookups: [winner], lines: [] });

    const result = await service.submit('dealer-1', input, ctx);

    expect(result).toMatchObject({ duplicate: true });
    expect(cart.view).not.toHaveBeenCalled();
  });
});
