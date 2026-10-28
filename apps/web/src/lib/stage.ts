import { type Locale, type PublicProduct } from '@barff/types';
import { type StageItem } from '@/motion/BottleStage3D';
import { getCutout } from './cutouts';
import { text } from './localized';

/**
 * Hero sahnasi uchun mahsulotlar.
 *
 * Har bir TA'MDAN bittasi (sahnada bir xil ta'm ikki marta ko'rinmasin),
 * 350 ml afzal: u hamma ta'mda bor va barchasi bir xil o'lchamda
 * ko'rinadi. Faqat KESILGAN surati bor mahsulotlar olinadi: admin panelda
 * yangi qo'shilgan mahsulot uchun u yo'q va u sahnaga tushmaydi (u
 * katalogda oddiy fotosurat bilan chiqadi).
 */
export function stageItems(products: PublicProduct[], locale: Locale, max = 8): StageItem[] {
  const byFlavor = new Map<string, PublicProduct>();

  for (const product of products) {
    if (getCutout(product.slug) === null) continue;

    const flavor = product.slug.replace(/-(350|1l)$/, '');
    const existing = byFlavor.get(flavor);
    const is350 = product.variants[0]?.volumeMl === 350;

    if (existing === undefined || (is350 && existing.variants[0]?.volumeMl !== 350)) {
      byFlavor.set(flavor, product);
    }
  }

  return [...byFlavor.values()].slice(0, max).flatMap((product) => {
    const cutout = getCutout(product.slug);
    if (cutout === null) return [];

    return [
      {
        slug: product.slug,
        name: text(product.name, locale, product.sku),
        href: `/${locale}/products/${product.slug}`,
        src: cutout.src,
        width: cutout.width,
        height: cutout.height,
        glow: cutout.glow,
      },
    ];
  });
}
