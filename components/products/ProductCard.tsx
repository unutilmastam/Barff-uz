'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getCategoryById } from '@/data/categories';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  className?: string;
  /** Ro'yxatdagi tartib raqami ("01"). Berilmasa ko'rsatilmaydi. */
  index?: string;
}

/**
 * Mahsulot kartasi — grid va ro'yxatlarda ishlatiladi.
 * Butun karta bitta havola: klik maydoni katta, klaviatura bilan bitta to'xtash nuqtasi.
 */
export function ProductCard({ product, className, index }: ProductCardProps) {
  const { locale } = useLocale();
  const category = getCategoryById(product.categoryId);

  return (
    <Link
      href={`/products/${product.slug}`}
      data-cursor="view"
      className={cn(
        'group border-line relative flex flex-col overflow-hidden rounded-lg border',
        'transition-colors duration-[--duration-ui] hover:border-foreground',
        className,
      )}
    >
      <div
        className="relative grid aspect-[4/5] place-items-center overflow-hidden"
        style={{ backgroundColor: `${product.color}14` }}
      >
        {index && (
          <span className="text-label text-muted absolute top-5 left-5 tabular-nums">{index}</span>
        )}

        {/* DEKOR — mahsulotdan orqada va uning ustiga tushmaydi (11-qoida). */}
        {product.fruits?.[0] && (
          <Image
            src={product.fruits[0].src}
            alt=""
            aria-hidden="true"
            width={320}
            height={320}
            sizes="96px"
            className="pointer-events-none absolute top-4 right-4 z-0 w-14 opacity-80 transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:scale-110 group-hover:-rotate-6"
          />
        )}

        {/* Foizli balandlik grid item ichida ishonchsiz — rasm aniq o'lchamli
            absolyut o'ramga joylanadi va `object-contain` bilan sig'diriladi. */}
        {product.image && (
          <div className="absolute inset-0 z-10 p-[12%]">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              width={product.image.width ?? 400}
              height={product.image.height ?? 720}
              sizes="(max-width: 768px) 45vw, 22vw"
              className="h-full w-full object-contain transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:-translate-y-2 group-hover:scale-[1.04]"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-5">
        {category && <span className="text-label text-muted">{category.title[locale]}</span>}
        <span className="font-display text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold tracking-[-0.02em]">
          {product.name[locale]}
        </span>
        {product.tagline && (
          <span className="text-muted text-sm">{product.tagline[locale]}</span>
        )}
      </div>
    </Link>
  );
}
