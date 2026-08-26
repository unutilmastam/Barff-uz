'use client';

import { NotFoundState } from '@/components/ui/NotFoundState';
import { useLocale } from '@/components/providers/LocaleProvider';

export default function ArticleNotFound() {
  const { t } = useLocale();
  return <NotFoundState title={t.article.notFound} href="/news" label={t.article.back} />;
}
