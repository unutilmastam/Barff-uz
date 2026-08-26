'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CONTENT_PENDING } from '@/lib/content';
import type { NewsItem } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Yangilik kartasi — bosh sahifada ham, `/news` da ham, o'xshash yangiliklarda ham. */
export function NewsCard({ item, className }: { item: NewsItem; className?: string }) {
  const { locale } = useLocale();

  return (
    <Link
      href={`/news/${item.slug}`}
      data-cursor="view"
      className={cn('group flex flex-col gap-4', className)}
    >
      <div className="bg-secondary relative aspect-[4/3] overflow-hidden rounded-lg">
        {item.image && (
          <Image
            src={item.image.src}
            alt={item.image.alt}
            width={item.image.width ?? 400}
            height={item.image.height ?? 720}
            sizes="(max-width: 768px) 90vw, 30vw"
            className="h-full w-full object-contain p-8 transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:scale-[1.06]"
          />
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-label text-muted">{item.date ?? CONTENT_PENDING}</span>
          <h3 className="font-display text-[clamp(1.25rem,2vw,1.75rem)] leading-tight font-bold tracking-[-0.02em]">
            {item.title[locale]}
          </h3>
          <p className="text-muted text-sm">{item.excerpt[locale]}</p>
        </div>
        <span
          aria-hidden="true"
          className="text-muted shrink-0 text-xl transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:text-foreground group-hover:rotate-45"
        >
          ↗
        </span>
      </div>
    </Link>
  );
}
