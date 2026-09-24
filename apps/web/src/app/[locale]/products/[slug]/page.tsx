import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, GlassCard, MediaFrame, Section } from '@barff/ui';
import { JsonLd } from '@/components/common/JsonLd';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { getAllProductSlugs, getProduct } from '@/lib/content';
import { formatMoney, text } from '@/lib/localized';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/structured-data';

/**
 * ISR muddati (soniya).
 *
 * Bu yerda ANIQ son turishi shart: Next segment sozlamalarini build
 * paytida STATIK tahlil qiladi va o'zgaruvchiga havolani tushunmaydi
 * ("Unknown identifier" xatosi). `CONTENT_REVALIDATE_SECONDS` bilan bir
 * xil qiymat — ikkalasi `content.ts` dagi izohda bog'langan.
 */
export const revalidate = 300;

/**
 * `true` — ro'yxatda YO'Q slug ham so'ralganda tayyorlanadi.
 *
 * `false` qilinsa noma'lum slug HAQIQIY 404 (status ham 404) berardi,
 * lekin CMS'ga qo'shilgan yangi mahsulot qayta build qilinmaguncha
 * saytda ko'rinmasdi. Kontent tizimi uchun bu jiddiyroq kamchilik.
 *
 * MA'LUM CHEKLOV: Next 15 dinamik sahifani oqim (streaming) bilan
 * yuboradi, shuning uchun sahifa ichidagi `notFound()` javob
 * sarlavhasini o'zgartira olmaydi — mavjud bo'lmagan mahsulot uchun
 * 404 SAHIFASI ko'rinadi, lekin status `200` bo'lib qoladi ("soft
 * 404"). Buni `generateMetadata` ichida `notFound()` chaqirib ham,
 * Googlebot User-Agent'i bilan ham tekshirdim — natija o'zgarmadi.
 * Shu sababli 404 sahifasiga `noindex` yozilgan: qidiruv tizimi uni
 * indekslamaydi. To'liq yechim S19 (SEO) da qayta ko'riladi.
 */
export const dynamicParams = true;

/**
 * Mavjud mahsulotlar build paytida tayyorlanadi.
 *
 * API javob bermasa (masalan Docker build ichida) bo'sh ro'yxat
 * qaytadi va build YIQILMAYDI — sahifalar birinchi so'rovda
 * tayyorlanadi.
 */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs('uz');

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const product = await getProduct(locale, slug);
  if (product === null) return {};

  return buildMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: text(product.name, locale, product.sku),
    description: text(product.description, locale),
    // Eng katta variant — ijtimoiy tarmoq kartochkasi uchun.
    imageUrl: product.images[0]?.sources.at(-1)?.url,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const product = await getProduct(locale, slug);

  // API javob bermasa ham, mavjud bo'lmagan mahsulot ham — 404.
  // Ikkalasini ajratish tashrifchiga hech narsa bermaydi.
  if (product === null) notFound();

  const name = text(product.name, locale, product.sku);
  const cover = product.images[0];
  const description = text(product.description, locale);

  const facts = [
    { label: messages.products.sku, value: product.sku },
    {
      label: messages.products.shelfLife,
      value:
        product.shelfLifeDays !== null
          ? `${product.shelfLifeDays} ${messages.products.shelfLifeDays}`
          : null,
    },
    { label: messages.products.ingredients, value: text(product.ingredients, locale) },
    { label: messages.products.storage, value: text(product.storage, locale) },
  ].filter((fact) => fact.value !== null && fact.value.length > 0);

  return (
    <Section>
      <JsonLd data={productJsonLd(product, locale)} />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: messages.nav.home, path: '/' },
          { name: messages.products.title, path: '/products' },
          { name, path: `/products/${product.slug}` },
        ])}
      />

      <Container>
        <Link
          href={`/${locale}/products`}
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
        >
          {messages.products.backToProducts}
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <MediaFrame ratio="portrait">
              {cover !== undefined ? (
                <ApiImage
                  image={cover}
                  alt={name}
                  sizes="(max-width: 1024px) 90vw, 560px"
                  // Sahifaning eng katta rasmi — LCP nomzodi.
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-fg-subtle)]">
                  {messages.common.empty}
                </div>
              )}
            </MediaFrame>

            {product.images.length > 1 && (
              <ul className="mt-4 grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((image) => (
                  <li key={image.id}>
                    <MediaFrame ratio="square">
                      <ApiImage
                        image={image}
                        alt={name}
                        sizes="120px"
                        className="h-full w-full object-cover"
                      />
                    </MediaFrame>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            {product.category !== null && (
              <p className="text-sm tracking-widest text-[var(--color-accent-text)] uppercase">
                {text(product.category.name, locale)}
              </p>
            )}

            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {name}
            </h1>

            {product.flavor !== null && (
              <Badge tone="brand" className="mt-4">
                {text(product.flavor, locale)}
              </Badge>
            )}

            {description.length > 0 && (
              <p className="mt-6 text-lg text-[var(--color-fg-muted)]">{description}</p>
            )}

            {product.variants.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-medium tracking-widest text-[var(--color-fg-muted)] uppercase">
                  {messages.products.variants}
                </h2>

                <ul className="mt-4 flex flex-col gap-3">
                  {product.variants.map((variant) => (
                    <GlassCard
                      as="li"
                      key={variant.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <span className="font-medium">
                        {variant.volumeMl} {messages.products.volumeUnit}
                        {variant.unitsPerPack !== null && (
                          <span className="ml-3 text-sm font-normal text-[var(--color-fg-muted)]">
                            {messages.products.perPack}: {variant.unitsPerPack}
                          </span>
                        )}
                      </span>

                      <span className="text-sm text-[var(--color-fg-muted)]">
                        {variant.price !== null
                          ? formatMoney(variant.price.amount, variant.price.currency, locale)
                          : messages.products.priceOnRequest}
                      </span>
                    </GlassCard>
                  ))}
                </ul>
              </div>
            )}

            {facts.length > 0 && (
              <dl className="mt-10 flex flex-col gap-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-t border-[var(--color-line)] pt-4">
                    <dt className="text-sm text-[var(--color-fg-muted)]">{fact.label}</dt>
                    <dd className="mt-1">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.documents.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-medium tracking-widest text-[var(--color-fg-muted)] uppercase">
                  {messages.products.documents}
                </h2>

                <ul className="mt-4 flex flex-col gap-2">
                  {product.documents.map((document) => (
                    <li key={document.id} className="text-sm">
                      {text(document.title, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
