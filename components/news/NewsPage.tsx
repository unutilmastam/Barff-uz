'use client';

import { Reveal } from '@/components/animation/Reveal';
import { TextReveal } from '@/components/animation/TextReveal';
import { NewsCard } from '@/components/news/NewsCard';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getSortedNews } from '@/data/news';

/** `/news` — barcha yangiliklar. */
export function NewsPage() {
  const { t } = useLocale();
  const items = getSortedNews();

  return (
    <main className="container-barff pt-32 pb-24 md:pt-40">
      <TextReveal as="h1" type="lines" className="text-section mb-12 block">
        {t.sections.news}
      </TextReveal>

      <Reveal as="ul" className="grid gap-8 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="flex">
            <NewsCard item={item} className="w-full" />
          </li>
        ))}
      </Reveal>
    </main>
  );
}
