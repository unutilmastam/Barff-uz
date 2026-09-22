import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MediaVisibility, PrismaClient } from '@barff/db';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { MemoryStorage } from '../src/media/storage/memory.storage';
import { GLOBAL_PREFIX } from '../src/swagger';

const prisma = new PrismaClient();
const base = `/${GLOBAL_PREFIX}`;

const ADMIN = { email: 'e2e-media@barff.uz', password: 'E2E-Media-Parol-2026' };
const DRIVER = { email: 'e2e-media-driver@barff.uz', password: 'E2E-MediaDriver-2026' };

async function makeUser(email: string, password: string, roleCode: string): Promise<string> {
  const passwords = new PasswordService();
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      fullName: `E2E ${roleCode}`,
      passwordHash: await passwords.hash(password),
      roles: { create: { roleId: role.id } },
    },
  });
  return user.id;
}

/** Haqiqiy PNG — sharp bilan yaratiladi, shuning uchun imzosi to'g'ri. */
function makePng(width = 200, height = 120): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 22, g: 180, b: 95 } },
  })
    .png()
    .toBuffer();
}

describe('Media (e2e)', () => {
  let app: INestApplication;
  let storage: MemoryStorage;
  let adminToken = '';
  let driverToken = '';
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    await app.init();

    storage = app.get(MemoryStorage);

    await makeUser(ADMIN.email, ADMIN.password, 'ADMIN');
    await makeUser(DRIVER.email, DRIVER.password, 'DRIVER');

    const login = async (creds: { email: string; password: string }) => {
      const res = await request(app.getHttpServer()).post(`${base}/auth/login`).send(creds);
      return res.body.accessToken as string;
    };

    adminToken = await login(ADMIN);
    driverToken = await login(DRIVER);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdIds } } });
    await prisma.mediaAsset.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN.email, DRIVER.email] } } });
    await prisma.$disconnect();
    await app?.close();
  });

  const upload = (token: string) =>
    request(app.getHttpServer()).post(`${base}/media`).set('Authorization', `Bearer ${token}`);

  describe('ruxsatlar', () => {
    it('tokensiz yuklab bolmaydi', async () => {
      const png = await makePng();
      await request(app.getHttpServer())
        .post(`${base}/media`)
        .attach('file', png, 'rasm.png')
        .expect(401);
    });

    it('media.upload ruxsati yoq rol 403 oladi', async () => {
      const png = await makePng();
      const res = await upload(driverToken).attach('file', png, 'rasm.png').expect(403);
      expect(res.body.code).toBe('FORBIDDEN_PERMISSION');
    });
  });

  describe('soxtalashtirilgan fayllar', () => {
    it('`.png` nomli HTML ni rad etadi', async () => {
      // Kengaytma ham, Content-Type ham to'g'ri ko'rinadi — faqat MAZMUN
      // noto'g'ri. Aynan shu holat saqlangan XSS ga olib kelardi.
      const res = await upload(adminToken)
        .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), {
          filename: 'rasm.png',
          contentType: 'image/png',
        })
        .expect(415);

      expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('`.jpg` nomli SVG ni rad etadi', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const res = await upload(adminToken)
        .attach('file', Buffer.from(svg), { filename: 'rasm.jpg', contentType: 'image/jpeg' })
        .expect(415);

      expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('bajariladigan faylni rad etadi', async () => {
      const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(64)]);
      await upload(adminToken)
        .attach('file', elf, { filename: 'rasm.png', contentType: 'image/png' })
        .expect(415);
    });

    it('bosh faylni rad etadi', async () => {
      const res = await upload(adminToken).attach('file', Buffer.alloc(0), 'bosh.png').expect(400);
      expect(res.body.code).toBe('EMPTY_FILE');
    });
  });

  describe('hajm chegarasi', () => {
    it('chegaradan katta faylni rad etadi', async () => {
      // Haqiqiy PNG, lekin juda katta: tur to'g'ri, hajm noto'g'ri.
      const big = await sharp({
        create: { width: 4000, height: 4000, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      const res = await upload(adminToken).attach('file', big, 'katta.png');

      expect(res.status).toBe(413);
      expect(res.body.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('muvaffaqiyatli yuklash', () => {
    it('rasmni yuklaydi va variantlar yaratadi', async () => {
      const png = await makePng(1200, 800);
      const res = await upload(adminToken).attach('file', png, 'mahsulot.png').expect(201);

      createdIds.push(res.body.id);

      expect(res.body.mimeType).toBe('image/png');
      expect(res.body.kind).toBe('IMAGE');
      expect(res.body.width).toBe(1200);
      expect(res.body.height).toBe(800);
      expect(res.body.blurDataUrl).toMatch(/^data:image\/webp;base64,/);

      const variants = res.body.variants as { format: string; width: number }[];
      expect(variants.length).toBeGreaterThan(0);
      expect(variants.some((v) => v.format === 'webp')).toBe(true);
      expect(variants.some((v) => v.format === 'avif')).toBe(true);
      // Originaldan kattaroq variant yaratilmasligi kerak.
      expect(variants.every((v) => v.width <= 1200)).toBe(true);
    });

    it('standart korinuvchanlik PRIVATE', async () => {
      const png = await makePng();
      const res = await upload(adminToken).attach('file', png, 'maxfiy.png').expect(201);
      createdIds.push(res.body.id);

      // Maxfiylik standart holat bo'lishi shart: aks holda hujjat
      // tasodifan ochiq qolib ketardi.
      expect(res.body.visibility).toBe(MediaVisibility.PRIVATE);
      expect(res.body.key).toMatch(/^private\//);
    });

    it('PUBLIC aniq sorash bilan beriladi', async () => {
      const png = await makePng();
      const res = await upload(adminToken)
        .field('visibility', 'PUBLIC')
        .attach('file', png, 'ochiq.png')
        .expect(201);
      createdIds.push(res.body.id);

      expect(res.body.visibility).toBe(MediaVisibility.PUBLIC);
      expect(res.body.key).toMatch(/^public\//);
    });

    it('kalit fayl nomidan EMAS, id va aniqlangan turdan quriladi', async () => {
      const png = await makePng();
      const res = await upload(adminToken).attach('file', png, '../../etc/passwd.png').expect(201);
      createdIds.push(res.body.id);

      // multipart qatlami fayl nomidagi yo'lni o'zi kesib tashlaydi, lekin
      // himoya bunga TAYANMAYDI: kalit butunlay id va imzo bo'yicha
      // aniqlangan turdan yig'iladi, mijoz bergan nomdan emas.
      expect(res.body.key).toBe(`private/${res.body.id}/original.png`);
      expect(res.body.key).not.toContain('..');
      expect(res.body.key).not.toContain('passwd');
    });

    it('PDF hujjat sifatida saqlanadi', async () => {
      const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(256)]);
      const res = await upload(adminToken).attach('file', pdf, 'shartnoma.pdf').expect(201);
      createdIds.push(res.body.id);

      expect(res.body.kind).toBe('DOCUMENT');
      expect(res.body.mimeType).toBe('application/pdf');
      // Hujjat uchun rasm variantlari yaratilmaydi.
      expect(res.body.variants).toBeNull();
    });
  });

  describe('manzil berish', () => {
    it('maxfiy fayl uchun imzolangan, muddatli havola', async () => {
      const png = await makePng();
      const created = await upload(adminToken).attach('file', png, 'maxfiy.png').expect(201);
      createdIds.push(created.body.id);

      const res = await request(app.getHttpServer())
        .get(`${base}/media/${created.body.id}/url`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.expiresInSeconds).toBeGreaterThan(0);
      expect(res.body.url).toContain('expires=');
    });

    it('ommaviy fayl uchun muddatsiz havola', async () => {
      const png = await makePng();
      const created = await upload(adminToken)
        .field('visibility', 'PUBLIC')
        .attach('file', png, 'ochiq.png')
        .expect(201);
      createdIds.push(created.body.id);

      const res = await request(app.getHttpServer())
        .get(`${base}/media/${created.body.id}/url`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.expiresInSeconds).toBeNull();
    });
  });

  describe('ochirish', () => {
    it('faylni va variantlarini ochiradi', async () => {
      const png = await makePng(800, 600);
      const created = await upload(adminToken).attach('file', png, 'ochiriladi.png').expect(201);
      createdIds.push(created.body.id);

      const before = storage.size;
      expect(before).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .delete(`${base}/media/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Obyektlar haqiqatan o'chishi kerak — ular joy egallaydi.
      expect(storage.size).toBeLessThan(before);

      await request(app.getHttpServer())
        .get(`${base}/media/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('media.delete ruxsati yoq rol ochira olmaydi', async () => {
      const png = await makePng();
      const created = await upload(adminToken).attach('file', png, 'himoyalangan.png').expect(201);
      createdIds.push(created.body.id);

      await request(app.getHttpServer())
        .delete(`${base}/media/${created.body.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });

  describe('royxat', () => {
    it('sahifalangan royxat qaytaradi', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/media?limit=2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('hasNextPage');
    });

    it('tur boyicha filtrlaydi', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/media?kind=DOCUMENT`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const item of res.body.items as { kind: string }[]) {
        expect(item.kind).toBe('DOCUMENT');
      }
    });
  });
});
