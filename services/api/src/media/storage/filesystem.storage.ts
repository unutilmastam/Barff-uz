import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app.config';
import { type PutObjectInput, type StorageAdapter, type StoredObject } from './storage.adapter';

/**
 * Fayl tizimida saqlash.
 *
 * NEGA KERAK: joylash muhitida (cPanel) obyekt saqlash (S3) yo'q, lekin
 * DOIMIY DISK bor (`docs/OPEN-QUESTIONS.md` Q18). Xotiradagi adapter
 * u yerda yaramaydi — u qayta ishga tushirishda barcha fayllarni
 * yo'qotadi.
 *
 * Ommaviy fayllar `root/public/...` ga yoziladi va ularni VEB-SERVER
 * to'g'ridan-to'g'ri beradi (`MEDIA_PUBLIC_URL`). Maxfiy fayllar
 * `root/private/...` da qoladi va faqat IMZOLANGAN havola orqali
 * beriladi — rasm `<img>` ichida yuklanganda sarlavha qo'shib
 * bo'lmaydi, shuning uchun ruxsat havolaning o'zida bo'lishi kerak.
 */
@Injectable()
export class FilesystemStorage implements StorageAdapter {
  private readonly root: string;
  private readonly publicBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly signingSecret: string;

  constructor(config: AppConfig) {
    const media = config.mediaStorage;
    this.root = resolve(media.root);
    this.publicBaseUrl = media.publicUrl.replace(/\/+$/, '');
    this.apiBaseUrl = config.baseUrl.replace(/\/+$/, '');
    this.signingSecret = media.signingSecret;
  }

  /**
   * Kalitni fayl yo'liga aylantiradi.
   *
   * ENG MUHIM TEKSHIRUV: kalit katalogdan TASHQARIGA chiqmasligi kerak.
   * `..` yoki mutlaq yo'l berilsa, hujumchi serverdagi istalgan faylni
   * o'qishi mumkin bo'lardi. Shuning uchun avval kalit shakli
   * tekshiriladi, keyin hosil bo'lgan yo'l ildiz ichida ekani QAYTA
   * tasdiqlanadi — bittasiga ishonib qolmaymiz.
   */
  private pathFor(key: string): string {
    if (!/^[a-z0-9][a-z0-9/._-]*$/i.test(key) || key.includes('..')) {
      throw new Error(`Yaroqsiz kalit: ${key}`);
    }

    const full = resolve(join(this.root, key));
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Kalit ildizdan tashqariga chiqdi: ${key}`);
    }

    return full;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const path = this.pathFor(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);

    return { key: input.key, byteSize: input.body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    // `force` — fayl allaqachon yo'q bo'lsa xato bermaydi.
    await rm(this.pathFor(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(this.pathFor(key));
      return info.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Vaqt bilan cheklangan imzolangan havola.
   *
   * Imzo — kalit va muddatdan olingan HMAC. Havola nusxalanib tarqalsa
   * ham muddati tugagach ishlamaydi, va muddatni o'zgartirib bo'lmaydi:
   * u imzo ichida.
   */
  signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = this.sign(key, expiresAt);
    const query = new URLSearchParams({ key, exp: String(expiresAt), sig: signature });

    return Promise.resolve(`${this.apiBaseUrl}/media/file?${query.toString()}`);
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /** Imzoni tekshiradi — havolani beruvchi endpoint shuni chaqiradi. */
  verify(key: string, expiresAt: number, signature: string): boolean {
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

    const expected = Buffer.from(this.sign(key, expiresAt));
    const given = Buffer.from(signature);

    /*
      Uzunliklar teng bo'lmasa `timingSafeEqual` xato otadi, shuning
      uchun avval tekshiriladi. Taqqoslashning o'zi VAQT BO'YICHA
      BARQAROR: oddiy `===` bilan hujumchi imzoni belgima-belgi
      topib olishi mumkin edi.
    */
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  private sign(key: string, expiresAt: number): string {
    return createHmac('sha256', this.signingSecret).update(`${key}:${expiresAt}`).digest('hex');
  }
}
