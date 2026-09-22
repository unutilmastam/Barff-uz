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

  it('tarjimalar bir-biridan farq qiladi (nusxa ko’chirilmagan)', async () => {
    const uz = await getMessages('uz');
    const ru = await getMessages('ru');

    // Agar ruscha fayl o'zbekchadan nusxa bo'lsa, bu test ushlaydi.
    expect(ru.home.heroTitle).not.toBe(uz.home.heroTitle);
    expect(ru.nav.products).not.toBe(uz.nav.products);
  });
});
