import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaFrame, Section } from '@barff/ui';
import { Container } from '@/components/layout/Container';
import { ApiImage } from '@/components/media/ApiImage';
import { isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/dictionary';
import { getAllNewsSlugs, getNewsArticle } from '@/lib/content';
import { formatDate, text } from '@/lib/localized';

export const revalidate = 300;

/**
 * Yangi maqola qayta build qilmasdan ko'rinishi kerak — shuning uchun
 * `true`. Ma'lum cheklov mahsulot sahifasidagi bilan bir xil: dinamik
 * sahifada `notFound()` status'ni 404 qila olmaydi (Next oqimi).
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllNewsSlugs('uz');

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const article = await getNewsArticle(locale, slug);
  if (article === null) return {};

  const title = text(article.title, locale, article.slug);
  const description = text(article.excerpt, locale);

  return {
    title,
    ...(description.length > 0 ? { description } : {}),
    alternates: { canonical: `/${locale}/news/${article.slug}` },
    openGraph: {
      title,
      ...(description.length > 0 ? { description } : {}),
      type: 'article',
      ...(article.publishedAt !== null ? { publishedTime: article.publishedAt } : {}),
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const article = await getNewsArticle(locale, slug);
  if (article === null) notFound();

  const title = text(article.title, locale, article.slug);

  /*
    Matn ODDIY MATN sifatida chiziladi — `dangerouslySetInnerHTML`
    ISHLATILMAYDI. CMS matnini HTML deb ishonish saqlangan XSS uchun
    eng keng tarqalgan yo'l; admin panelga kirgan har qanday shaxs
    (yoki o'g'irlangan sessiya) saytning barcha tashrifchilariga skript
    yuborishi mumkin bo'lardi. Abzatslar bo'sh qator bo'yicha ajratiladi.
  */
  const paragraphs = text(article.body, locale)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <Section>
      <Container className="max-w-3xl">
        <Link
          href={`/${locale}/news`}
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
        >
          {messages.news.backToNews}
        </Link>

        <article className="mt-8">
          {article.publishedAt !== null && (
            <time dateTime={article.publishedAt} className="text-sm text-[var(--color-fg-subtle)]">
              {formatDate(article.publishedAt, locale)}
            </time>
          )}

          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {article.coverImage !== null && (
            <MediaFrame ratio="wide" className="mt-8">
              <ApiImage
                image={article.coverImage}
                alt={title}
                sizes="(max-width: 768px) 90vw, 768px"
                priority
                className="h-full w-full object-cover"
              />
            </MediaFrame>
          )}

          <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-[var(--color-fg-muted)]">
            {/* Abzatslarda barqaror id yo'q, tartib esa o'zgarmaydi —
                shuning uchun kalit sifatida indeks ishlatiladi. */}
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
            ))}
          </div>
        </article>
      </Container>
    </Section>
  );
}
