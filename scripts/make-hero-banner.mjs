/*
  Bosh sahifa banneri (B01): `assets/hero/banner-source.jpg` dan
  `apps/web/public/hero/` ga AVIF/WebP/JPG variantlarini tayyorlaydi.

    node scripts/make-hero-banner.mjs

  Banner o'zgartirilmaydi — faqat o'lchami va formati. Telefon uchun
  alohida KESIM: keng rasmning o'ng yarmi (shishalar o'sha yerda),
  aks holda tor ekranda faqat bo'sh qora fon ko'rinardi.
  Sharp `services/api` ichida o'rnatilgan.
*/
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../services/api/package.json', import.meta.url));
const sharp = require('sharp');

const source = fileURLToPath(new URL('../assets/hero/banner-source.jpg', import.meta.url));
const out = fileURLToPath(new URL('../apps/web/public/hero/', import.meta.url));
await mkdir(out, { recursive: true });

const meta = await sharp(source).metadata();
const { width, height } = meta;
console.log(`manba: ${width}x${height}`);

/** Telefon kesimi: o'ngdan, chap 40% tashlanadi. */
const mobileLeft = Math.round(width * 0.4);
const variants = [
  { name: 'banner', pipeline: sharp(source).resize({ width: 1408 }) },
  { name: 'banner-960', pipeline: sharp(source).resize({ width: 960 }) },
  {
    name: 'banner-m',
    pipeline: sharp(source).extract({
      left: mobileLeft,
      top: 0,
      width: width - mobileLeft,
      height,
    }),
  },
];

for (const { name, pipeline } of variants) {
  await pipeline.clone().avif({ quality: 55 }).toFile(`${out}${name}.avif`);
  await pipeline.clone().webp({ quality: 78 }).toFile(`${out}${name}.webp`);
  await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${out}${name}.jpg`);
  console.log(`  ✓ ${name}`);
}
