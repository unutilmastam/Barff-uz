export interface StoredObject {
  key: string;
  byteSize: number;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  /**
   * `private` — faqat imzolangan havola orqali (CLAUDE.md §12).
   * `public` bo'lsa ham bucket'ning O'ZI ochiq emas: ommaviy fayllar
   * CDN orqali beriladi, to'g'ridan-to'g'ri bucket'dan emas.
   */
  visibility: 'public' | 'private';
  /** Mijoz ko'radigan fayl nomi (yuklab olishda). */
  originalName?: string;
}

/**
 * Obyekt saqlash uchun adapter.
 *
 * Interfeys atayin tor: ilova S3 ning o'ziga xos xususiyatlariga
 * bog'lanib qolmasligi kerak (CLAUDE.md §21 dagi "provider adapters"
 * yondashuvi). Lokalda MinIO, production'da S3 — kod uchun farqi yo'q.
 */
export interface StorageAdapter {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;

  /**
   * Vaqtinchalik havola. Maxfiy hujjatlar faqat shu yo'l bilan beriladi.
   * `expiresInSeconds` qisqa bo'lishi kerak — havola nusxalanib tarqalsa,
   * u tez orada yaroqsiz bo'lib qolsin.
   */
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /** Ommaviy fayl uchun doimiy manzil (CDN orqali). */
  publicUrl(key: string): string;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
