'use client';

import Image from 'next/image';
import Link from 'next/link';
import { TextReveal } from '@/components/animation/TextReveal';
import { NewsCard } from '@/components/news/NewsCard';
import { useLocale } from '@/components/providers/LocaleProvider';
import { news } from '@/data/news';
import { CONTENT_PENDING } from '@/lib/content';
import type { NewsItem } from '@/lib/types';

const RELATED_COUNT = 3;

/**
 * Yangilik sahifasi: orqaga tugmasi → sana → sarlavha → hero rasm → matn → o'xshash yangiliklar.
 *
 * Maqola tanasi (`body`) bo'sh bo'lsa matn O'YLAB TOPILMAYDI — `excerpt` ko'rsatiladi
 * va `[CLIENT CONTENT REQUIRED]` belgisi qo'yiladi.
 */
export function ArticleDetails({ article }: { article: NewsItem }) {
  const { locale, t } = useLocale();
  const related = news.filter((item) => item.id !== article.id).slice(0, RELATED_COUNT);

  return (
    <main className="pt-32 pb-24 md:pt-40">
      <article className="container-barff">
        <Link href="/news" className="text-label text-muted hover:text-foreground">
          ← {t.article.back}
        </Link>

        <p className="text-label text-muted mt-8">{article.date ?? CONTENT_PENDING}</p>

        <TextReveal as="h1" type="lines" className="text-section mt-3 block">
          {article.title[locale]}
        </TextReveal>

        {article.image && (
          <div className="bg-secondary mt-10 grid aspect-[16/9] place-items-center overflow-hidden rounded-lg">
            <Image
              src={article.image.src}
              alt={article.image.alt}
              width={article.image.width ?? 400}
              height={article.image.height ?? 720}
              priority
              sizes="(max-width: 768px) 92vw, 70vw"
              className="h-[80%] w-auto object-contain"
            />
          </div>
        )}

        <div className="text-body mt-10 flex max-w-[62ch] flex-col gap-4">
          <p>{article.excerpt[locale]}</p>
          {article.body ? (
            <p>{article.body[locale]}</p>
          ) : (
            <p className="text-muted text-label">{CONTENT_PENDING}</p>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-barff mt-24">
          <h2 className="text-label text-muted mb-8">{t.article.related}</h2>
          <ul className="grid gap-8 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.id} className="flex">
                <NewsCard item={item} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
