import { Inter, Manrope } from 'next/font/google';

/**
 * Display shrift — sarlavhalar, katta typography.
 * Satoshi bepul emas; BUILD_PLAN ruxsat bergan variantlardan Manrope tanlandi.
 */
export const display = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display-family',
});

/** Body shrift — matn, UI. */
export const body = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body-family',
});
