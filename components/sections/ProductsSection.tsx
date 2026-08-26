'use client';

import { TextReveal } from '@/components/animation/TextReveal';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { products } from '@/data/products';

/** Bosh sahifadagi mahsulotlar to'ri + barcha mahsulotlarga o'tish. */
export function ProductsSection() {
  const { t } = useLocale();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="products-title" className="container-barff py-24 md:py-32">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <TextReveal as="h2" id="products-title" type="lines" className="text-section block">
          {t.sections.products}
        </TextReveal>
        <Button href="/products" variant="outline" data-cursor="open">
          {t.hero.cta}
        </Button>
      </div>

      <ProductGrid products={products} />
    </section>
  );
}
