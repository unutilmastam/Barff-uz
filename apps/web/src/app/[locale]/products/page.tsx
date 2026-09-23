import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { ProductCard } from '@/components/products/ProductCard';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getProducts } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

/**
 * ISR muddati (soniya).
 *
 * Bu yerda ANIQ son turishi shart: Next segment sozlamalarini build
 * paytida STATIK tahlil qiladi va o'zgaruvchiga havolani tushunmaydi
 * ("Unknown identifier" xatosi). `CONTENT_REVALIDATE_SECONDS` bilan bir
 * xil qiymat — ikkalasi `content.ts` dagi izohda bog'langan.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return buildMetadata({
    locale,
    path: '/products',
    title: messages.products.title,
    description: messages.products.subtitle,
  });
}

/** Mahsulotlar ro'yxati. Sahifalash va filtrlar — S14 (katalog). */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const page = await getProducts(locale, { limit: 24 });

  return (
    <Section>
      <Container>
        <p className="text-sm font-medium tracking-widest text-[var(--color-brand-400)] uppercase">
          {messages.products.subtitle}
        </p>

        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {messages.products.title}
        </h1>

        <div className="mt-12">
          {page === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : page.items.length === 0 ? (
            <EmptyState message={messages.products.empty} />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {page.items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} messages={messages} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </Section>
  );
}
