import { describe, expect, it } from 'vitest';
import { LOCALES } from './config';
import { getMessages } from './dictionary';

/** Ichma-ich obyektdagi barcha kalit yo'llarini yig'adi. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

describe('tarjimalar', () => {
  it('uchala tilda ham AYNAN bir xil kalitlar bor', async () => {
    const [uz, ru, en] = await Promise.all(LOCALES.map((l) => getMessages(l)));

    const uzKeys = keyPaths(uz).sort();
    expect(keyPaths(ru).sort()).toEqual(uzKeys);
    expect(keyPaths(en).sort()).toEqual(uzKeys);
  });

  it("hech bir qiymat bo'sh emas", async () => {
    for (const locale of LOCALES) {
      const messages = await getMessages(locale);

      for (const path of keyPaths(messages)) {
        const value = path
          .split('.')
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], messages);

        expect(typeof value, `${locale}: ${path}`).toBe('string');
        expect((value as string).trim().length, `${locale}: ${path}`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Tarjima qilinmay qolgan qiymatlarni topadi.
   *
   * Yangi kalit qo'shilganda uni uchala faylga NUSXA qilib qo'yish
   * oson — tip tekshiruvi buni ushlamaydi, chunki kalit bor va
   * qiymat satr. Bu test esa aynan shuni ushlaydi.
   *
   * Ba'zi qiymatlar uchala tilda BIR XIL bo'lishi TABIIY: xalqaro
   * so'zlar va o'lchov birliklari. Ular ro'yxatda aniq sanab
   * o'tilgan — ya'ni istisno ko'rinib turadi.
   */
  it("tarjima qilinmay qolgan qiymat yo'q", async () => {
    const identicalByDesign = new Set([
      'meta.title',
      'lead.phoneHint',
      'lead.email',
      'contact.email',
      'common.mockBadge',
      'legal.pendingNote',
      'gallery.counter',
      // `ml` — o'lchov birligi qisqartmasi, o'zbekcha va inglizcha bir xil.
      'products.volumeUnit',
    ]);

    const uz = await getMessages('uz');

    for (const locale of ['ru', 'en'] as const) {
      const other = await getMessages(locale);
      const copied: string[] = [];

      for (const path of keyPaths(uz)) {
        if (identicalByDesign.has(path)) continue;

        const read = (source: unknown) =>
          path
            .split('.')
            .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], source);

        if (read(uz) === read(other)) copied.push(path);
      }

      expect(copied, `${locale}: tarjima qilinmagan kalitlar`).toEqual([]);
    }
  });
});
