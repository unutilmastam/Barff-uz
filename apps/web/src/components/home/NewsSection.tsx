import Link from 'next/link';
import { type Locale, type PublicNewsSummary } from '@barff/types';
import { Button, GlassCard, Section, SectionHeader } from '@barff/ui';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Container } from '@/components/layout/Container';
import { type Messages } from '@/i18n/dictionary';
import { formatDate, text } from '@/lib/localized';
import { routeReady } from '@/lib/routes';
import { Reveal } from '@/motion/Reveal';
import { TextReveal } from '@/motion/TextReveal';

/** So'nggi yangiliklar. To'liq ro'yxat va maqola sahifasi — S13. */
export function NewsSection({
  locale,
  messages,
  articles,
}: {
  locale: Locale;
  messages: Messages;
  articles: PublicNewsSummary[] | null;
}) {
  return (
    <Section tone="raised">
      <Container>
        <SectionHeader
          eyebrow={messages.home.newsEyebrow}
          title={<TextReveal as="span">{messages.home.newsTitle}</TextReveal>}
          action={
            routeReady('news') ? (
              <Button asChild variant="secondary">
                <Link href={`/${locale}/news`}>{messages.home.newsAll}</Link>
              </Button>
            ) : undefined
          }
        />

        <div className="mt-12">
          {articles === null ? (
            <ErrorState
              title={messages.common.unavailableTitle}
              body={messages.common.unavailableBody}
            />
          ) : articles.length === 0 ? (
            <EmptyState message={messages.common.empty} />
          ) : (
            <Reveal as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger>
              {articles.map((article) => (
                <GlassCard
                  as="li"
                  key={article.id}
                  // Bosiladigan ko'rinish faqat HAQIQATAN bosiladigan bo'lsa.
                  interactive={routeReady('news')}
                  className="relative flex flex-col gap-3 p-6"
                >
                  {article.publishedAt !== null && (
                    <time
                      dateTime={article.publishedAt}
                      className="text-sm text-[var(--color-fg-subtle)]"
                    >
                      {formatDate(article.publishedAt, locale)}
                    </time>
                  )}

                  {/* Maqola sahifasi S13 da quriladi — u paydo bo'lgunicha
                      sarlavha havola EMAS, oddiy matn. */}
                  <h3 className="display-4">
                    {routeReady('news') ? (
                      <Link
                        href={`/${locale}/news/${article.slug}`}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {text(article.title, locale, article.slug)}
                      </Link>
                    ) : (
                      text(article.title, locale, article.slug)
                    )}
                  </h3>

                  {article.excerpt !== null && (
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {text(article.excerpt, locale)}
                    </p>
                  )}
                </GlassCard>
              ))}
            </Reveal>
          )}
        </div>
      </Container>
    </Section>
  );
}
