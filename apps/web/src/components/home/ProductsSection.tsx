import Link from 'next/link';
import { type Locale, type PublicProduct } from '@barff/types';
import { Button, Section, SectionHeader } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { ProductCard } from '@/components/products/ProductCard';
import { type Messages } from '@/i18n/dictionary';

/**
 * Mahsulotlar bo'limi.
 *
 * Mobilda gorizontal siljish, kengroq ekranda to'r. Siljish CSS bilan
 * (`snap`) — JavaScript karusel emas: kontentga yetib borish uchun
 * animatsiya SHART bo'lmasligi kerak (CLAUDE.md §17).
 */
export function ProductsSection({
  locale,
  messages,
  products,
}: {
  locale: Locale;
  messages: Messages;
  products: PublicProduct[] | null;
}) {
  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow={messages.home.productsEyebrow}
          title={messages.home.productsTitle}
          action={
            <Button asChild variant="secondary">
              <Link href={`/${locale}/products`}>{messages.home.productsAll}</Link>
            </Button>
          }
        />

        <div className="mt-12">
          {products === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : products.length === 0 ? (
            <EmptyState message={messages.products.empty} />
          ) : (
            <ul
              className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
              // Gorizontal ro'yxat klaviatura bilan ham siljiy olishi uchun.
              tabIndex={0}
              aria-label={messages.home.productsTitle}
            >
              {products.map((product) => (
                <li key={product.id} className="w-[75vw] shrink-0 snap-start sm:w-auto">
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
