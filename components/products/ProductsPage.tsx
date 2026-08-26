'use client';

import { useMemo, useState } from 'react';
import { TextReveal } from '@/components/animation/TextReveal';
import { ProductFilter } from '@/components/products/ProductFilter';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useLocale } from '@/components/providers/LocaleProvider';
import { products } from '@/data/products';

/** `/products` — barcha mahsulotlar, kategoriya bo'yicha filtr bilan. */
export function ProductsPage() {
  const { t } = useLocale();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const product of products) {
      result[product.categoryId] = (result[product.categoryId] ?? 0) + 1;
    }
    return result;
  }, []);

  const visible = categoryId
    ? products.filter((product) => product.categoryId === categoryId)
    : products;

  return (
    <main className="container-barff pt-32 pb-24 md:pt-40">
      <TextReveal as="h1" type="lines" className="text-section mb-10 block">
        {t.sections.products}
      </TextReveal>

      <div className="mb-12">
        <ProductFilter
          value={categoryId}
          onChange={setCategoryId}
          counts={counts}
          total={products.length}
        />
      </div>

      {visible.length > 0 ? (
        // `key` filtr o'zgarganda gridni qayta yaratadi — reveal animatsiyasi
        // yangi kartalar uchun qaytadan ishlaydi.
        <ProductGrid key={categoryId ?? 'all'} products={visible} />
      ) : (
        <p className="text-muted">{t.filter.empty}</p>
      )}
    </main>
  );
}
