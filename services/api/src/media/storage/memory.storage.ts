import { Injectable } from '@nestjs/common';
import { type PutObjectInput, type StorageAdapter, type StoredObject } from './storage.adapter';

/**
 * Xotiradagi saqlash — testlar va S3 sozlanmagan lokal muhit uchun.
 *
 * Production'da ISHLATILMAYDI: `StorageModule` uni faqat S3 sozlamalari
 * yo'q bo'lganda tanlaydi va production'da bunday sozlama majburiy.
 */
@Injectable()
export class MemoryStorage implements StorageAdapter {
  private readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  put(input: PutObjectInput): Promise<StoredObject> {
    this.objects.set(input.key, { body: input.body, contentType: input.contentType });
    return Promise.resolve({ key: input.key, byteSize: input.body.byteLength });
  }

  get(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (object === undefined) return Promise.reject(new Error(`Obyekt topilmadi: ${key}`));
    return Promise.resolve(object.body);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  exists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }

  signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    // Haqiqiy imzo emas, lekin shakli bir xil — testlar muddat
    // uzatilayotganini tekshira oladi.
    return Promise.resolve(`memory://${key}?expires=${expiresInSeconds}`);
  }

  publicUrl(key: string): string {
    return `memory://${key}`;
  }

  /** Testlar uchun. */
  clear(): void {
    this.objects.clear();
  }

  get size(): number {
    return this.objects.size;
  }
}
