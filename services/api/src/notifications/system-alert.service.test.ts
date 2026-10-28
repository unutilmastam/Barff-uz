import { describe, expect, it, vi } from 'vitest';
import { SystemAlertService, type SystemErrorReport } from './system-alert.service';

const report = (over: Partial<SystemErrorReport> = {}): SystemErrorReport => ({
  method: 'GET',
  url: '/api/v1/products?search=ali',
  status: 500,
  requestId: 'req-1',
  errorName: 'PrismaClientKnownRequestError',
  ...over,
});

function build() {
  const notify = vi.fn(async (_input: unknown) => undefined);
  const prisma = {
    systemSetting: {
      findUnique: vi.fn(async () => ({
        value: { telegramChatId: '-100123', email: 'REPLACE_WITH_REAL_DATA' },
      })),
    },
    user: { findMany: vi.fn(async () => [{ id: 'admin-1' }]) },
  };
  const service = new SystemAlertService(prisma as never, { notify } as never);
  return { service, notify, prisma };
}

const MIN = 60_000;

describe('SystemAlertService', () => {
  it('xato haqida xabar yuboradi: adminlarga in-app, sozlangan manzilga tashqi', async () => {
    const { service, notify } = build();

    expect(await service.reportError(report(), 0)).toBe(true);

    expect(notify).toHaveBeenCalledOnce();
    const sent = notify.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent['event']).toBe('system.error');
    expect(sent['recipientIds']).toEqual(['admin-1']);
    // `REPLACE_*` manzil sozlanmagan hisoblanadi — faqat Telegram.
    expect(sent['addresses']).toEqual({ TELEGRAM: '-100123' });
  });

  it('MA’LUMOT SIZMAYDI: so‘rov satri kesiladi, xato XABARI umuman yuborilmaydi', async () => {
    const { service, notify } = build();

    await service.reportError(
      report({ url: '/api/v1/auth/x?token=SIR-QIYMAT&phone=+998901234567' }),
      0,
    );

    const sent = JSON.stringify(notify.mock.calls[0]?.[0]);
    expect(sent).not.toContain('SIR-QIYMAT');
    expect(sent).not.toContain('998901234567');
    expect(sent).toContain('PrismaClientKnownRequestError');
    expect(sent).toContain('req-1');
  });

  it('bir xil xato 10 daqiqada BIR marta (baza o‘chganda minglab xabar bo‘lmasin)', async () => {
    const { service, notify } = build();

    expect(await service.reportError(report(), 0)).toBe(true);
    expect(await service.reportError(report({ requestId: 'req-2' }), 5 * MIN)).toBe(false);
    expect(await service.reportError(report({ requestId: 'req-3' }), 9 * MIN)).toBe(false);
    // 10 daqiqadan keyin yana xabar beradi.
    expect(await service.reportError(report({ requestId: 'req-4' }), 10 * MIN)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('boshqa xato (boshqa yo‘l yoki status) alohida xabar oladi', async () => {
    const { service, notify } = build();

    expect(await service.reportError(report(), 0)).toBe(true);
    expect(await service.reportError(report({ url: '/api/v1/orders' }), 1)).toBe(true);
    expect(await service.reportError(report({ status: 503 }), 2)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(3);
  });

  it('soatiga eng ko‘pi 20 ta, keyin tinch; soat o‘tgach qayta ochiladi', async () => {
    const { service, notify } = build();

    for (let i = 0; i < 30; i += 1) {
      await service.reportError(report({ url: `/api/v1/r${i}` }), i);
    }
    expect(notify).toHaveBeenCalledTimes(20);

    expect(await service.reportError(report({ url: '/api/v1/yangi' }), 61 * MIN)).toBe(true);
  });

  it('ogohlantirish yiqilsa ham xato tashqariga chiqmaydi', async () => {
    const { service, notify } = build();
    notify.mockRejectedValueOnce(new Error('Telegram javob bermadi'));

    await expect(service.reportError(report(), 0)).resolves.toBe(false);
  });
});
