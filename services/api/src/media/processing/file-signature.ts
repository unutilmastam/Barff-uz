/**
 * Fayl turini MAZMUNI bo'yicha aniqlash.
 *
 * CLAUDE.md §20: "Never trust file extensions alone". Kengaytma ham,
 * `Content-Type` sarlavhasi ham mijoz beradigan ma'lumot — ularni
 * o'zgartirish juda oson. Masalan `.jpg` deb nomlangan HTML fayl
 * saqlanib, keyin brauzerda ochilsa, bu saqlangan XSS bo'lardi.
 *
 * Shuning uchun tur faylning birinchi baytlari ("magic bytes") bo'yicha
 * aniqlanadi va faqat ruxsat etilgan ro'yxatdagi turlar qabul qilinadi.
 */

export type DetectedMime =
  'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'application/pdf';

interface Signature {
  mime: DetectedMime;
  /** Faylning boshidagi baytlar. `null` — istalgan bayt. */
  bytes: readonly (number | null)[];
  offset?: number;
  /** Qo'shimcha tekshiruv (konteyner ichidagi turni ajratish uchun). */
  extra?: (buffer: Buffer) => boolean;
}

const SIGNATURES: readonly Signature[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  {
    // RIFF konteyneri: `RIFF....WEBP`
    mime: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46],
    extra: (buffer) => buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    // ISO BMFF konteyneri: 4 bayt uzunlik, keyin `ftyp`, keyin brend.
    mime: 'image/avif',
    bytes: [null, null, null, null, 0x66, 0x74, 0x79, 0x70],
    extra: (buffer) => ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii')),
  },
];

/** Eng uzun imzoni qoplash uchun yetarli bo'lgan bosh qism. */
export const SIGNATURE_PROBE_BYTES = 16;

export function detectMime(buffer: Buffer): DetectedMime | null {
  for (const signature of SIGNATURES) {
    const offset = signature.offset ?? 0;
    if (buffer.length < offset + signature.bytes.length) continue;

    const matches = signature.bytes.every(
      (byte, index) => byte === null || buffer[offset + index] === byte,
    );

    if (!matches) continue;
    if (signature.extra !== undefined && !signature.extra(buffer)) continue;

    return signature.mime;
  }

  return null;
}

export const IMAGE_MIMES: readonly DetectedMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export function isImage(mime: DetectedMime): boolean {
  return IMAGE_MIMES.includes(mime);
}

/** Kengaytmani ANIQLANGAN turdan olamiz, mijoz bergan nomdan emas. */
export function extensionFor(mime: DetectedMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'application/pdf':
      return 'pdf';
  }
}
