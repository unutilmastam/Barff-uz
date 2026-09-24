import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type AppConfig } from '../../config/app.config';
import { FilesystemStorage } from './filesystem.storage';

/**
 * Fayl tizimida saqlash.
 *
 * Eng muhim ikki xossa tekshiriladi: kalit katalogdan TASHQARIGA
 * chiqa olmasligi va imzolangan havolani soxtalashtirib bo'lmasligi.
 * Ikkalasi ham xavfsizlik xossasi — S3 da ular provayder zimmasida
 * edi, bu adapterda esa bizning zimmamizda.
 */
describe('FilesystemStorage', () => {
  let root: string;
  let storage: FilesystemStorage;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'barff-media-'));

    storage = new FilesystemStorage({
      mediaStorage: {
        root,
        publicUrl: 'https://barff.uz/media/',
        signingSecret: 's'.repeat(40),
      },
      baseUrl: 'https://api.barff.uz/api/v1',
    } as unknown as AppConfig);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const put = (key: string) =>
    storage.put({
      key,
      body: Buffer.from('salom'),
      contentType: 'text/plain',
      visibility: 'public',
    });

  it('faylni yozadi va qaytarib oqiydi', async () => {
    const stored = await put('public/abc/original.png');

    expect(stored.byteSize).toBe(5);
    expect((await storage.get('public/abc/original.png')).toString()).toBe('salom');
    expect(await readFile(join(root, 'public/abc/original.png'), 'utf8')).toBe('salom');
  });

  it('mavjudligini tekshiradi va ochiradi', async () => {
    await put('public/o/original.png');
    expect(await storage.exists('public/o/original.png')).toBe(true);

    await storage.delete('public/o/original.png');
    expect(await storage.exists('public/o/original.png')).toBe(false);
  });

  it('yoq faylni ochirish XATO BERMAYDI', async () => {
    // Takroriy o'chirish oddiy holat — u xatoga aylanmasligi kerak.
    await expect(storage.delete('public/yoq/original.png')).resolves.toBeUndefined();
  });

  describe('katalogdan chiqib ketish', () => {
    // Bu tekshiruvsiz hujumchi serverdagi istalgan faylni o'qiy olardi.
    for (const key of [
      '../../../etc/passwd',
      'public/../../etc/passwd',
      '/etc/passwd',
      'public/..%2f..%2fetc/passwd',
    ]) {
      it(`rad etadi: ${key}`, async () => {
        await expect(storage.get(key)).rejects.toThrow();
      });
    }
  });

  describe('imzolangan havola', () => {
    it('kalit va muddatni ozida saqlaydi', async () => {
      const url = await storage.signedUrl('private/x/original.pdf', 300);
      const parsed = new URL(url);

      expect(parsed.origin + parsed.pathname).toBe('https://api.barff.uz/api/v1/media/file');
      expect(parsed.searchParams.get('key')).toBe('private/x/original.pdf');
      expect(Number(parsed.searchParams.get('exp'))).toBeGreaterThan(Date.now() / 1000);
      expect(parsed.searchParams.get('sig')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('ozi bergan imzoni qabul qiladi', async () => {
      const url = new URL(await storage.signedUrl('private/x/original.pdf', 300));

      expect(
        storage.verify(
          'private/x/original.pdf',
          Number(url.searchParams.get('exp')),
          url.searchParams.get('sig') ?? '',
        ),
      ).toBe(true);
    });

    it('MUDDATNI ozgartirishga yol qoymaydi', async () => {
      const url = new URL(await storage.signedUrl('private/x/original.pdf', 300));
      const later = Number(url.searchParams.get('exp')) + 10_000;

      // Muddat imzo ichida — uni cho'zib bo'lmaydi.
      expect(
        storage.verify('private/x/original.pdf', later, url.searchParams.get('sig') ?? ''),
      ).toBe(false);
    });

    it('BOSHQA faylga qollab bolmaydi', async () => {
      const url = new URL(await storage.signedUrl('private/x/original.pdf', 300));

      expect(
        storage.verify(
          'private/boshqa/original.pdf',
          Number(url.searchParams.get('exp')),
          url.searchParams.get('sig') ?? '',
        ),
      ).toBe(false);
    });

    it('muddati otgan havolani rad etadi', () => {
      const past = Math.floor(Date.now() / 1000) - 1;
      expect(storage.verify('private/x/original.pdf', past, 'a'.repeat(64))).toBe(false);
    });

    it('notogri uzunlikdagi imzo XATO OTMAYDI, faqat rad etadi', () => {
      // `timingSafeEqual` teng bo'lmagan uzunlikda xato otadi.
      const future = Math.floor(Date.now() / 1000) + 300;
      expect(storage.verify('private/x/original.pdf', future, 'qisqa')).toBe(false);
    });
  });

  it('ommaviy manzilda qosh chiziq takrorlanmaydi', () => {
    // `publicUrl` sozlamasi oxirida `/` bilan berilgan.
    expect(storage.publicUrl('public/a/original.png')).toBe(
      'https://barff.uz/media/public/a/original.png',
    );
  });
});
