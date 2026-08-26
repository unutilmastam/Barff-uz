import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleDetails } from '@/components/news/ArticleDetails';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { getNewsBySlug, news } from '@/data/news';
import { METADATA_LOCALE, pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return news.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getNewsBySlug(slug);

  if (!article) return { title: 'Maqola topilmadi' };

  return pageMetadata({
    title: article.title[METADATA_LOCALE],
    description: article.excerpt[METADATA_LOCALE],
    path: `/news/${article.slug}`,
    type: 'article',
    // Sana bo'lmasa maydon umuman yozilmaydi — soxta sana qo'yilmaydi.
    publishedTime: article.date,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getNewsBySlug(slug);

  if (!article) notFound();

  return (
    <>
      <ArticleJsonLd
        headline={article.title[METADATA_LOCALE]}
        description={article.excerpt[METADATA_LOCALE]}
        path={`/news/${article.slug}`}
        image={article.image?.src}
        datePublished={article.date}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'BARFF', path: '/' },
          { name: 'Yangiliklar', path: '/news' },
          { name: article.title[METADATA_LOCALE], path: `/news/${article.slug}` },
        ]}
      />
      <ArticleDetails article={article} />
    </>
  );
}
