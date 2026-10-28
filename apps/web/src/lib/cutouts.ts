import manifest from './cutouts.json';

/**
 * Fonsiz (kesib olingan) mahsulot suratlari — 3D effektlar uchun.
 *
 * Manba: BARFF'ning HAQIQIY fotosuratlari, faqat fon olingan
 * (`scripts/make-cutouts.py`). Shisha shakli va etiketi o'zgartirilmagan.
 *
 * `glow` — mahsulot rangidan olingan BEZAK rangi: orqa yorug'lik va
 * chegara uchun. Matn rangi sifatida ISHLATILMAYDI: mahsulot rangi
 * kontrastni ta'minlamaydi (CLAUDE.md §16).
 *
 * Mahsulot admin panelda yangi qo'shilsa, unda kesilgan surat bo'lmaydi —
 * `getCutout` `null` qaytaradi va sayt oddiy fotosuratga qaytadi.
 */
export interface Cutout {
  src: string;
  width: number;
  height: number;
  glow: string;
}

const CUTOUTS = manifest as Record<string, Cutout>;

export function getCutout(slug: string): Cutout | null {
  return CUTOUTS[slug] ?? null;
}

export const CUTOUT_SLUGS = Object.keys(CUTOUTS);
