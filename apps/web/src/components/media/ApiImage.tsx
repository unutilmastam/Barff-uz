import { type PublicImage } from '@barff/types';

/**
 * API'dan kelgan rasm.
 *
 * NEGA `next/image` EMAS: S08 dagi media quvuri rasmni allaqachon
 * AVIF va WebP formatlarida, 320/640/1024/1600 kengliklarda tayyorlab
 * qo'yadi va blur o'rindoshini ham beradi. `next/image` ustidan yana
 * bir marta optimallashtirish o'sha ishni takrorlardi, CDN'dagi tayyor
 * variantlarni chetlab o'tardi va har bir media hostini
 * `remotePatterns` ga yozishni talab qilardi.
 *
 * `<picture>` esa aynan shu quvur uchun mo'ljallangan (image-processor.ts
 * izohiga qarang): brauzer o'zi qo'llab-quvvatlaydigan formatni va
 * ekraniga mos kenglikni tanlaydi. `next/image` loyihaning ICHIDAGI
 * statik rasmlar uchun o'z o'rnida qoladi.
 */
export interface ApiImageProps {
  image: PublicImage;
  /**
   * Muqobil matn. BO'SH satr — rasm bezak ekanini bildiradi
   * (ekran o'quvchi uni o'tkazib yuboradi); shuning uchun majburiy.
   */
  alt: string;
  /** `sizes` — brauzerga rasm qanchalik keng ko'rinishini aytadi. */
  sizes?: string;
  /** Sahifaning eng katta rasmi uchun: kechiktirmasdan yuklanadi. */
  priority?: boolean;
  className?: string;
}

function srcSet(image: PublicImage, format: string): string {
  return image.sources
    .filter((source) => source.format === format)
    .sort((a, b) => a.width - b.width)
    .map((source) => `${source.url} ${source.width}w`)
    .join(', ');
}

export function ApiImage({
  image,
  alt,
  sizes = '100vw',
  priority = false,
  className,
}: ApiImageProps) {
  const avif = srcSet(image, 'avif');
  const webp = srcSet(image, 'webp');

  // Eng keng WebP — `<img src>` uchun zaxira (juda eski brauzerlar).
  const fallback = [...image.sources]
    .filter((source) => source.format === 'webp')
    .sort((a, b) => b.width - a.width)[0];

  if (fallback === undefined) return null;

  return (
    <picture>
      {avif.length > 0 && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      {webp.length > 0 && <source type="image/webp" srcSet={webp} sizes={sizes} />}
      <img
        src={fallback.url}
        alt={alt}
        // O'lcham OLDINDAN beriladi — rasm yuklanguncha joy band bo'ladi
        // va sahifa sakramaydi (CLS).
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={className}
        style={
          image.blurDataUrl !== null
            ? {
                backgroundImage: `url(${image.blurDataUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
    </picture>
  );
}
