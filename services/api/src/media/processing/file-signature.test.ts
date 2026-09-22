import { describe, expect, it } from 'vitest';
import { detectMime, extensionFor, isImage } from './file-signature';

/** Berilgan baytlardan fayl boshini yasaydi. */
function head(...bytes: number[]): Buffer {
  return Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);
}

describe('detectMime', () => {
  it('JPEG ni taniydi', () => {
    expect(detectMime(head(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('PNG ni taniydi', () => {
    expect(detectMime(head(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
  });

  it('PDF ni taniydi', () => {
    expect(detectMime(Buffer.from('%PDF-1.7\n...'))).toBe('application/pdf');
  });

  it('WebP ni RIFF konteyneri ichidan taniydi', () => {
    const buffer = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBP'),
      Buffer.alloc(16),
    ]);
    expect(detectMime(buffer)).toBe('image/webp');
  });

  it('WebP bolmagan RIFF (masalan WAV) ni rad etadi', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WAVE'),
      Buffer.alloc(16),
    ]);
    expect(detectMime(wav)).toBeNull();
  });

  it('AVIF ni ftyp brendi boyicha taniydi', () => {
    const buffer = Buffer.concat([
      Buffer.from([0, 0, 0, 0x20]),
      Buffer.from('ftyp'),
      Buffer.from('avif'),
      Buffer.alloc(16),
    ]);
    expect(detectMime(buffer)).toBe('image/avif');
  });

  it('boshqa ftyp brendini (MP4) rad etadi', () => {
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x20]),
      Buffer.from('ftyp'),
      Buffer.from('isom'),
      Buffer.alloc(16),
    ]);
    expect(detectMime(mp4)).toBeNull();
  });

  describe('soxtalashtirilgan fayllar', () => {
    it('`.jpg` nomli HTML ni rad etadi', () => {
      // Aynan shu holat saqlangan XSS ga olib kelardi.
      expect(detectMime(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    });

    it('SVG ni rad etadi (u ichida skript saqlashi mumkin)', () => {
      expect(detectMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    });

    it('ELF bajariladigan faylni rad etadi', () => {
      expect(detectMime(head(0x7f, 0x45, 0x4c, 0x46))).toBeNull();
    });

    it('ZIP arxivini rad etadi', () => {
      expect(detectMime(head(0x50, 0x4b, 0x03, 0x04))).toBeNull();
    });

    it('bosh fayl uchun null qaytaradi', () => {
      expect(detectMime(Buffer.alloc(0))).toBeNull();
    });

    it('juda qisqa faylda qulamaydi', () => {
      expect(detectMime(Buffer.from([0xff]))).toBeNull();
    });
  });
});

describe('isImage', () => {
  it('rasmlarni ajratadi', () => {
    expect(isImage('image/png')).toBe(true);
    expect(isImage('application/pdf')).toBe(false);
  });
});

describe('extensionFor', () => {
  it('aniqlangan turdan kengaytma beradi', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('application/pdf')).toBe('pdf');
  });
});
