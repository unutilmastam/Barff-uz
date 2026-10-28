import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { AppConfig } from '../src/config/app.config';
import { FilesystemStorage } from '../src/media/storage/filesystem.storage';
import { STORAGE_ADAPTER } from '../src/media/storage/storage.adapter';
import { GLOBAL_PREFIX } from '../src/swagger';

const base = `/${GLOBAL_PREFIX}`;
const ID = '0175a20c-240b-4f38-ab79-4c1a72b618c8';
const BODY = Buffer.from('avif-bayt-lari');

/**
 * Ommaviy rasm yo'li — fayl tizimi adapteri bilan (cPanel, Q18).
 *
 * Bu yo'l bo'lmaganda `MEDIA_PUBLIC_URL` ni qanday qo'ymasin, ommaviy
 * rasmlar 404 berardi: veb-server `MEDIA_ROOT/public` ni bermaydi
 * (S40 shuni ushladi — hujjatdagi qiymat bilan HAMMA mahsulot rasmi
 * ishlamasdi).
 */
describe('Ommaviy rasm (fayl tizimi) (e2e)', () => {
  let app: INestApplication;
  let root = '';

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'barff-media-'));

    await mkdir(join(root, 'public', ID), { recursive: true });
    await mkdir(join(root, 'private', ID), { recursive: true });
    await writeFile(join(root, 'public', ID, '640w.avif'), BODY);
    await writeFile(join(root, 'public', ID, '1024w.webp'), BODY);
    await writeFile(join(root, 'public', ID, 'original.png'), Buffer.from('ASL-EXIF'));
    await writeFile(join(root, 'private', ID, '640w.avif'), Buffer.from('MAXFIY'));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STORAGE_ADAPTER)
      .useValue(
        new FilesystemStorage({
          baseUrl: 'http://localhost:3000/api/v1',
          mediaStorage: {
            root,
            publicUrl: 'http://localhost:3000/api/v1/media',
            signingSecret: 'x'.repeat(40),
          },
        } as unknown as AppConfig),
      )
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await rm(root, { recursive: true, force: true });
  });

  const get = (path: string) => request(app.getHttpServer()).get(`${base}/media/public${path}`);

  it('variantni tokensiz beradi: tur, kesh va cross-origin sarlavhalari bilan', async () => {
    const res = await get(`/${ID}/640w.avif`).expect(200);

    expect(res.headers['content-type']).toBe('image/avif');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    // helmet standarti `same-origin` — usiz barff.uz sahifasi api.barff.uz rasmini ko'rmaydi.
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.from(res.body).equals(BODY)).toBe(true);
  });

  it('WebP ham beriladi', async () => {
    const res = await get(`/${ID}/1024w.webp`).expect(200);
    expect(res.headers['content-type']).toBe('image/webp');
  });

  it('ORIGINAL berilmaydi (EXIF bo‘lishi mumkin)', async () => {
    await get(`/${ID}/original.png`).expect(404);
  });

  it('maxfiy fayl bu yo‘ldan berilmaydi', async () => {
    // `private/` katalogidagi fayl nomi bir xil, lekin yo'l `public/` bilan cheklangan.
    const other = '11111111-1111-4111-8111-111111111111';
    await mkdir(join(root, 'private', other), { recursive: true });
    await writeFile(join(root, 'private', other, '640w.avif'), Buffer.from('MAXFIY'));

    await get(`/${other}/640w.avif`).expect(404);
  });

  it('yo‘l buzishga urinishlar 404 (500 emas, fayl sizmaydi)', async () => {
    for (const path of [
      `/..%2F..%2Fetc/passwd`,
      `/${ID}/..%2Foriginal.png`,
      `/${ID}/%2e%2e%2f640w.avif`,
      `/not-a-uuid/640w.avif`,
      `/${ID}/640w.avif%00.png`,
      `/${ID}/640w.png`,
      `/${ID}/320w.avif`, // mavjud emas
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(res.text, path).not.toContain('MAXFIY');
      expect(res.text, path).not.toContain('root:');
    }
  });

  /**
   * Umumiy limit (daqiqasiga 120) bu yo'lga TEGMASLIGI kerak: katalog
   * sahifasida o'nlab rasm bor. Avval 130 so'rovdan 10 tasi `429` bergan.
   */
  it('rasm so‘rovlari umumiy limitga tushmaydi', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 140; i += 1) {
      statuses.push((await get(`/${ID}/640w.avif`)).status);
    }

    expect(statuses.filter((status) => status === 429)).toHaveLength(0);
    expect(new Set(statuses)).toEqual(new Set([200]));
  });
});
