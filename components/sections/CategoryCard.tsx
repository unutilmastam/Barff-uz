'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  className?: string;
}

/**
 * Kategoriya kartasi: ulkan raqam → rasm → meva → sarlavha → qisqa matn → CTA.
 * Desktop (gorizontal lenta) va mobil (vertikal ro'yxat) uchun bir xil komponent.
 */
export function CategoryCard({ category, className }: CategoryCardProps) {
  const { locale, t } = useLocale();

  return (
    <Link
      href={category.href}
      data-cursor="view"
      className={cn(
        'group border-line relative flex flex-col justify-between overflow-hidden rounded-lg border p-8',
        'transition-colors duration-[--duration-ui] hover:border-foreground',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="font-display text-[clamp(4rem,9vw,7rem)] leading-none font-extrabold tracking-[-0.04em] opacity-10 transition-opacity duration-[--duration-ui] group-hover:opacity-25"
      >
        {category.index}
      </span>

      <div className="relative grid flex-1 place-items-center py-6">
        {category.fruit && (
          <Image
            src={category.fruit.src}
            alt=""
            aria-hidden="true"
            width={320}
            height={320}
            sizes="140px"
            className="pointer-events-none absolute top-0 right-0 w-24 opacity-80 transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:scale-110 group-hover:rotate-12"
          />
        )}
        {category.image && (
          <Image
            src={category.image.src}
            alt={category.image.alt}
            width={category.image.width ?? 400}
            height={category.image.height ?? 720}
            sizes="(max-width: 768px) 55vw, 24vw"
            className="relative h-[clamp(11rem,26vh,18rem)] w-auto object-contain transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:-translate-y-3"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-[clamp(1.5rem,2.2vw,2rem)] leading-tight font-bold tracking-[-0.02em]">
          {category.title[locale]}
        </h3>
        <p className="text-muted max-w-[34ch] text-sm">{category.description[locale]}</p>
        <span className="text-label mt-2 inline-flex items-center gap-2">
          {t.hero.cta}
          <span
            aria-hidden="true"
            className="transition-transform duration-[--duration-micro] group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
