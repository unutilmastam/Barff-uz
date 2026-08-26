'use client';

import { ProductCard } from '@/components/products/ProductCard';
import { Reveal } from '@/components/animation/Reveal';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  className?: string;
}

/** Mahsulotlar to'ri — scroll'da kartalar ketma-ket chiqadi. */
export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <Reveal
      as="ul"
      className={cn('grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6', className)}
    >
      {products.map((product, position) => (
        <li key={product.id} className="flex">
          <ProductCard
            product={product}
            index={String(position + 1).padStart(2, '0')}
            className="w-full"
          />
        </li>
      ))}
    </Reveal>
  );
}
