'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/animation/Reveal';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getSortedNews } from '@/data/news';
import { CONTENT_PENDING } from '@/lib/content';

/**
 * Editorial yangilik kartalari.
 *
 * Hover'da rasm `scale(1.06)` ga kattalashadi va strelka aylanadi (spec talabi).
 * Rasm o'ram `overflow-hidden` — kattalashish karta chegarasidan chiqmaydi.
 *
 * SANA o'ylab topilmaydi: `date` bo'sh bo'lsa `[CLIENT CONTENT REQUIRED]` ko'rinadi.
 */
export function NewsSection() {
  const { locale, t } = useLocale();
  const items = getSortedNews();

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="news-title" className="container-barff py-24 md:py-32">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <TextReveal as="h2" id="news-title" type="lines" className="text-section block">
          {t.sections.news}
        </TextReveal>
      </div>

      <Reveal as="ul" className="grid gap-8 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="flex">
            <Link
              href={`/news/${item.slug}`}
              data-cursor="view"
              className="group flex w-full flex-col gap-4"
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
                  <span className="text-label text-muted">
                    {item.date ?? CONTENT_PENDING}
                  </span>
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
          </li>
        ))}
      </Reveal>
    </section>
  );
}
