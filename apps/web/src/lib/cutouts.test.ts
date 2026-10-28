import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUTOUT_SLUGS, getCutout } from './cutouts';

const root = resolve(__dirname, '../../../..');

describe('kesilgan mahsulot suratlari', () => {
  it('katalogdagi HAR BIR mahsulotning kesilgan surati bor', () => {
    const catalog = JSON.parse(
      readFileSync(resolve(root, 'assets/product-photos/catalog.json'), 'utf8'),
    ) as { products: { slug: string }[] };

    for (const product of catalog.products) {
      expect(getCutout(product.slug), product.slug).not.toBeNull();
    }
  });

  it('manifestdagi har bir fayl mavjud va o‘lchami to‘g‘ri', () => {
    expect(CUTOUT_SLUGS.length).toBeGreaterThanOrEqual(12);

    for (const slug of CUTOUT_SLUGS) {
      const cutout = getCutout(slug);
      expect(cutout, slug).not.toBeNull();
      expect(existsSync(resolve(root, 'apps/web/public', (cutout?.src ?? '').slice(1))), slug).toBe(
        true,
      );
      expect(cutout?.width).toBeGreaterThan(100);
      expect(cutout?.height).toBeGreaterThan(cutout?.width ?? 0);
      expect(cutout?.glow).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('noma’lum mahsulot uchun null (oddiy fotosuratga qaytish)', () => {
    expect(getCutout('admin-yangi-qoshgan-mahsulot')).toBeNull();
  });
});
