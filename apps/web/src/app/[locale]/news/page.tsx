import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlassCard, MediaFrame, Section } from '@barff/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { ImageReveal } from '@/motion/ImageReveal';
import { isLocale } from '@/i18n/config';

import { getMessages } from '@/i18n/dictionary';
import { getNews } from '@/lib/content';
import { formatDate, text } from '@/lib/localized';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return buildMetadata({
    locale,
    path: '/news',
    title: messages.news.title,
    description: messages.news.subtitle,
  });
}

/** Yangiliklar ro'yxati. Sahifalash S19 (SEO) da kengaytiriladi. */
export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const page = await getNews(locale, { limit: 12 });

  return (
    <>
      <PageHeader eyebrow={messages.news.subtitle} title={messages.news.title} />

      <Section>
        <Container>
          {page === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : page.items.length === 0 ? (
            <EmptyState message={messages.news.empty} />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {page.items.map((article) => (
                <GlassCard
                  as="li"
                  key={article.id}
                  interactive
                  className="group relative flex flex-col overflow-hidden"
                >
                  {article.coverImage !== null && (
                    <MediaFrame
                      ratio="wide"
                      className="rounded-none border-0 border-b border-[var(--color-line)]"
                    >
                      <ImageReveal className="h-full w-full">
                        <ApiImage
                          image={article.coverImage}
                          alt={text(article.title, locale, article.slug)}
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
                          className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-barff)] group-hover:scale-[1.04]"
                        />
                      </ImageReveal>
                    </MediaFrame>
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-6">
                    {article.publishedAt !== null && (
                      <time
                        dateTime={article.publishedAt}
                        className="text-sm text-[var(--color-fg-subtle)]"
                      >
                        {formatDate(article.publishedAt, locale)}
                      </time>
                    )}

                    <h2 className="display-4">
                      <Link
                        href={`/${locale}/news/${article.slug}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {text(article.title, locale, article.slug)}
                      </Link>
                    </h2>

                    {article.excerpt !== null && (
                      <p className="text-sm text-[var(--color-fg-muted)]">
                        {text(article.excerpt, locale)}
                      </p>
                    )}
                  </div>
                </GlassCard>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
