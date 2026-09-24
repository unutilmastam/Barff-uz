import Link from 'next/link';
import { type Locale, type PublicProduct } from '@barff/types';
import { Button, Section, SectionHeader } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { ProductCard } from '@/components/products/ProductCard';
import { type Messages } from '@/i18n/dictionary';
import { HorizontalScroll } from '@/motion/HorizontalScroll';
import { TextReveal } from '@/motion/TextReveal';

/**
 * Mahsulotlar ko'rgazmasi.
 *
 * DESKTOPDA bo'lim ekranga yopishtiriladi va lenta skroll bilan yon
 * tomonga suriladi (2026-08-26 qurilishidagi "Kolleksiya"). MOBILDA
 * esa oddiy gorizontal siljish (`snap`) qoladi — telefonda
 * yopishtirish barmoq skrollini qo'lga oladi.
 *
 * Har ikkala holatda ham lenta klaviatura bilan siljiydi va kontentga
 * yetib borish uchun animatsiya SHART emas (CLAUDE.md §17).
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
          title={<TextReveal as="span">{messages.home.productsTitle}</TextReveal>}
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
            <HorizontalScroll trackClassName="-mx-4 flex snap-x snap-mandatory gap-5 px-4 pb-4 md:mx-0 md:w-max md:snap-none md:px-0 md:pb-0">
              <ul
                className="contents"
                // Gorizontal ro'yxat klaviatura bilan ham siljiy olishi uchun.
                tabIndex={0}
                aria-label={messages.home.productsTitle}
              >
                {products.map((product, index) => (
                  <li
                    key={product.id}
                    className="w-[75vw] shrink-0 snap-start sm:w-[45vw] md:w-[26rem]"
                  >
                    <p className="mb-3 text-[length:var(--text-label)] tracking-[var(--text-label--letter-spacing)] text-[var(--color-fg-subtle)]">
                      {String(index + 1).padStart(2, '0')} /{' '}
                      {String(products.length).padStart(2, '0')}
                    </p>
                    <ProductCard product={product} locale={locale} messages={messages} />
                  </li>
                ))}
              </ul>
            </HorizontalScroll>
          )}
        </div>
      </Container>
    </Section>
  );
}
