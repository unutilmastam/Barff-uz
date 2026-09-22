import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service';

/**
 * Ishga tushishda bazaga ulanib bo'lmasa, ilova QULAMASLIGI kerak.
 *
 * Bu xulq CI'dagi Docker smoke testi va production'dagi qayta ishga tushish
 * sikli uchun muhim: baza bir lahzaga yo'qolganda har bir task darhol
 * o'lmasligi, readiness esa buni ochiq ko'rsatishi lozim.
 */
describe('PrismaService.onModuleInit', () => {
  it('ulanish xatosini yutadi va xato tashlamaydi', async () => {
    const service = new PrismaService();

    vi.spyOn(service, '$connect').mockRejectedValue(new Error("baza yo'q"));
    const logError = vi.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalled();
  });

  it('ulanish muvaffaqiyatli bolsa xabar yozadi', async () => {
    const service = new PrismaService();

    vi.spyOn(service, '$connect').mockResolvedValue(undefined);
    const logInfo = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

    await service.onModuleInit();
    expect(logInfo).toHaveBeenCalled();
  });

  it('isReachable sorov xatosida false qaytaradi', async () => {
    const service = new PrismaService();

    vi.spyOn(service, '$queryRaw').mockRejectedValue(new Error('uzildi'));

    expect(await service.isReachable()).toBe(false);
  });
});
