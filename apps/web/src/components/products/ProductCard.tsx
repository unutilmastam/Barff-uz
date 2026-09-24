import Link from 'next/link';
import { type Locale, type PublicProduct } from '@barff/types';
import { GlassCard, MediaFrame } from '@barff/ui';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { formatMoney, text } from '@/lib/localized';
import { ImageReveal } from '@/motion/ImageReveal';

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

  return (
    <GlassCard as="article" interactive className="group relative flex flex-col overflow-hidden">
      <MediaFrame
        ratio="portrait"
        className="rounded-none border-0 border-b border-[var(--color-line)]"
      >
        {image !== undefined ? (
          <ImageReveal className="h-full w-full">
            <ApiImage
              image={image}
              alt={name}
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
              : `${variant.volumeMl} ${messages.products.volumeUnit}`
            : messages.products.priceOnRequest}
        </p>
      </div>
    </GlassCard>
  );
}
