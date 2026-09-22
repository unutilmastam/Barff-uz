import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S3Storage } from './s3.storage';

/**
 * S3 adapterining MANTIQI.
 *
 * Bu muhitda haqiqiy MinIO ishga tushirib bo'lmadi (egress bloklangan),
 * shuning uchun tekshiruv S3 klientiga YUBORILAYOTGAN buyruqlar ustida
 * olib boriladi. Bu tarmoqqa chiqmaydi, lekin eng muhim shartni —
 * obyektlar ommaviy ACL bilan yozilmasligini — qat'iy tasdiqlaydi.
 */
function makeStorage(overrides: Record<string, unknown> = {}) {
  const config = {
    s3: {
      endpoint: 'http://127.0.0.1:9000',
      region: 'us-east-1',
      bucket: 'barff-media',
      accessKeyId: 'kalit',
      secretAccessKey: 'sir',
      forcePathStyle: true,
      publicUrl: 'https://cdn.barff.uz',
      ...overrides,
    },
  };

  const storage = new S3Storage(config as never);
  const send = vi.fn().mockResolvedValue({});
  // Klient private — testda uni almashtirish uchun bracket sintaksisi.
  (storage as unknown as { client: { send: unknown } }).client = { send };

  return { storage, send };
}

describe('S3Storage.put', () => {
  let ctx: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    ctx = makeStorage();
  });

  it("obyektni ACL SIZ yozadi — bucket ommaviy bo'lib qolmasligi kerak", async () => {
    await ctx.storage.put({
      key: 'public/abc/original.png',
      body: Buffer.from('data'),
      contentType: 'image/png',
      visibility: 'public',
    });

    const command = ctx.send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);

    // CLAUDE.md §12: "S3 private by default". `visibility: 'public'`
    // bo'lsa ham obyektga ochiq ACL QO'YILMAYDI — ommaviy fayllar CDN
    // orqali beriladi, bucket esa yopiq qolaveradi.
    expect(command.input.ACL).toBeUndefined();
  });

  it('bucket, kalit va turni togri uzatadi', async () => {
    await ctx.storage.put({
      key: 'private/abc/original.pdf',
      body: Buffer.from('%PDF-'),
      contentType: 'application/pdf',
      visibility: 'private',
    });

    const { input } = ctx.send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(input.Bucket).toBe('barff-media');
    expect(input.Key).toBe('private/abc/original.pdf');
    expect(input.ContentType).toBe('application/pdf');
  });

  it('fayl nomidagi qoshtirnoq va yangi qatorni tozalaydi', async () => {
    await ctx.storage.put({
      key: 'private/abc/original.pdf',
      body: Buffer.from('%PDF-'),
      contentType: 'application/pdf',
      visibility: 'private',
      // Tozalanmasa, bu `Content-Disposition` sarlavhasini buzardi.
      originalName: 'hisob"\r\nX-Injected: 1.pdf',
    });

    const { input } = ctx.send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(input.ContentDisposition).not.toContain('\r');
    expect(input.ContentDisposition).not.toContain('\n');
    expect(input.ContentDisposition).not.toContain('"hisob"');
  });

  it('qaytarilgan hajm tananing hajmiga teng', async () => {
    const body = Buffer.alloc(1234);
    const result = await ctx.storage.put({
      key: 'k',
      body,
      contentType: 'image/png',
      visibility: 'private',
    });

    expect(result).toEqual({ key: 'k', byteSize: 1234 });
  });
});

describe('S3Storage.delete', () => {
  it('DeleteObjectCommand yuboradi', async () => {
    const { storage, send } = makeStorage();
    await storage.delete('private/abc/original.png');

    const command = send.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input.Key).toBe('private/abc/original.png');
  });
});

describe('S3Storage.exists', () => {
  it('mavjud obyekt uchun true', async () => {
    const { storage, send } = makeStorage();
    expect(await storage.exists('bor')).toBe(true);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
  });

  it('xatoda false qaytaradi, xato tashlamaydi', async () => {
    const { storage, send } = makeStorage();
    send.mockRejectedValue(new Error('NotFound'));
    expect(await storage.exists('yoq')).toBe(false);
  });
});

describe('S3Storage.publicUrl', () => {
  it('CDN manzilidan quradi', () => {
    const { storage } = makeStorage();
    expect(storage.publicUrl('public/a/b.png')).toBe('https://cdn.barff.uz/public/a/b.png');
  });

  it('oxiridagi slashni takrorlamaydi', () => {
    const { storage } = makeStorage({ publicUrl: 'https://cdn.barff.uz/' });
    expect(storage.publicUrl('public/a.png')).toBe('https://cdn.barff.uz/public/a.png');
  });

  it("CDN sozlanmagan bolsa bosh qaytaradi — bucket'ni ochmaydi", () => {
    const { storage } = makeStorage({ publicUrl: undefined });
    expect(storage.publicUrl('public/a.png')).toBe('');
  });
});
