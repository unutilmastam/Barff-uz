import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleDetails } from '@/components/news/ArticleDetails';
import { getNewsBySlug, news } from '@/data/news';

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
  return { title: article ? `BARFF — ${article.title.uz}` : 'BARFF' };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getNewsBySlug(slug);

  if (!article) notFound();

  return <ArticleDetails article={article} />;
}
