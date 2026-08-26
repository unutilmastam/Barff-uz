import type { Metadata } from 'next';
import { NewsPage } from '@/components/news/NewsPage';

export const metadata: Metadata = { title: 'BARFF — News' };

export default function Page() {
  return <NewsPage />;
}
