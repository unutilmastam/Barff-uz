import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

/**
 * KAFOLAT: bildirishnoma xatosi ASOSIY amalni buzmaydi.
 *
 * Bu sinf boshidagi izohda yozilgan edi, lekin AMALDA
 * bajarilmagan edi va buni CI ko'rsatdi: diler arizasi `202`
 * o'rniga `500` qaytardi, garchi diler bazaga yozilgan bo'lsa ham.
 *
 * Sabab — qabul qiluvchilar ro'yxati O'QILGANDAN keyin, lekin
 * bildirishnoma YOZILISHIDAN oldin o'sha foydalanuvchi o'chirilgan
 * edi, va tashqi kalit xatosi `notify()` dan yuqoriga chiqib ketdi.
 *
 * Shuning uchun bu testlar SOXTA Prisma bilan ishlaydi: bazani
 * shunday holatga keltirish qiyin, xatoni esa aynan shu nuqtada
 * yuzaga keltirish oson.
 */
function makeService(overrides: {
  createMany?: () => Promise<unknown>;
  create?: () => Promise<unknown>;
}) {
  const prisma = {
    notification: {
      createMany: overrides.createMany ?? vi.fn().mockResolvedValue({ count: 1 }),
      create: overrides.create ?? vi.fn().mockResolvedValue({ id: 'n-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  };

  const provider = {
    channel: 'TELEGRAM' as const,
    isConfigured: () => true,
    send: vi.fn().mockResolvedValue(undefined),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- soxta bog'liqliklar
  const service = new NotificationsService(prisma as any, [provider as any]);

  return { service, prisma, provider };
}

describe('NotificationsService.notify', () => {
  it('IN-APP yozuv xatosi yuqoriga CHIQMAYDI', async () => {
    const { service } = makeService({
      createMany: () =>
        Promise.reject(
          new Error('Foreign key constraint violated: notifications_recipientId_fkey'),
        ),
    });

    // Aynan shu chaqiruv ilgari `500` ga aylanardi.
    await expect(
      service.notify({ event: 'dealer.registered', body: 'x', recipientIds: ['yo‘q-user'] }),
    ).resolves.toBeUndefined();
  });

  it('IN-APP yiqilsa ham TASHQI kanal baribir yuboriladi', async () => {
    const { service, provider } = makeService({
      createMany: () => Promise.reject(new Error('baza xatosi')),
    });

    await service.notify({
      event: 'dealer.registered',
      body: 'x',
      recipientIds: ['yo‘q-user'],
      addresses: { TELEGRAM: '12345' },
    });

    // Ikki yo'nalish ALOHIDA o'ralgani shu bilan tasdiqlanadi.
    expect(provider.send).toHaveBeenCalledOnce();
  });

  it('TASHQI yozuv xatosi ham yuqoriga chiqmaydi', async () => {
    const { service } = makeService({
      create: () => Promise.reject(new Error('baza xatosi')),
    });

    await expect(
      service.notify({ event: 'lead.created', body: 'x', addresses: { TELEGRAM: '12345' } }),
    ).resolves.toBeUndefined();
  });

  it('hammasi joyida bo‘lsa ikkala kanal ham ishlaydi', async () => {
    const { service, prisma, provider } = makeService({});

    await service.notify({
      event: 'lead.created',
      body: 'x',
      recipientIds: ['u-1'],
      addresses: { TELEGRAM: '12345' },
    });

    expect(prisma.notification.createMany).toHaveBeenCalledOnce();
    expect(provider.send).toHaveBeenCalledOnce();
  });
});
