import Link from 'next/link';
import { type Locale, type PublicProduct } from '@barff/types';
import { GlassCard, MediaFrame } from '@barff/ui';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { formatMoney, formatVolume, text } from '@/lib/localized';
import { getCutout } from '@/lib/cutouts';
import { ImageReveal } from '@/motion/ImageReveal';
import { Tilt3D } from '@/motion/Tilt3D';
import { CutoutMedia } from './CutoutMedia';

/**
 * Mahsulot kartochkasi.
 *
 * Butun karta emas, SARLAVHA havola: ekran o'quvchi havolalar
 * ro'yxatida "mahsulot nomi" ni ko'radi, "kartochka" ni emas.
 * `after:absolute` bilan bosiladigan maydon baribir butun kartaga
 * yoyiladi, shuning uchun sichqoncha bilan ishlash o'zgarmaydi.
 *
 * Rasm `ImageReveal` ichida: u `clip-path` bilan pastdan ochiladi.
 * Harakat o'chiq bo'lsa rasm shunchaki joyida turadi — o'ram
 * ko'rinishga ta'sir qilmaydi (`h-full` bilan ramkani to'ldiradi).
 */
export function ProductCard({
  product,
  locale,
  messages,
}: {
  product: PublicProduct;
  locale: Locale;
  messages: Messages;
}) {
  const name = text(product.name, locale, product.sku);
  const image = product.images[0];
  const variant = product.variants[0];
  const cutout = getCutout(product.slug);

  return (
    <GlassCard
      as="article"
      interactive
      data-tilt-host
      className="group relative flex flex-col overflow-hidden"
    >
      <MediaFrame
        ratio="portrait"
        className="rounded-none border-0 border-b border-[var(--color-line)]"
      >
        {cutout !== null ? (
          <Tilt3D className="relative h-full w-full">
            <CutoutMedia
              cutout={cutout}
              alt={name}
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 280px"
            />
          </Tilt3D>
        ) : image !== undefined ? (
          <ImageReveal className="h-full w-full">
            <ApiImage
              image={image}
              alt={text(image.alt, locale, name)}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
              className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-barff)] group-hover:scale-[1.04]"
            />
          </ImageReveal>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-fg-subtle)]">
            {messages.common.empty}
          </div>
        )}
      </MediaFrame>

      <div className="flex flex-1 flex-col gap-2 p-5">
        {product.category !== null && (
          <p className="eyebrow">{text(product.category.name, locale)}</p>
        )}

        <h3 className="display-4">
          <Link
            href={`/${locale}/products/${product.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {name}
          </Link>
        </h3>

        <p className="mt-auto pt-2 text-sm text-[var(--color-fg-muted)] tabular-nums">
          {variant !== undefined
            ? variant.price !== null
              ? formatMoney(variant.price.amount, variant.price.currency, locale)
              : formatVolume(variant.volumeMl, messages.products)
            : messages.products.priceOnRequest}
        </p>
      </div>
    </GlassCard>
  );
}
