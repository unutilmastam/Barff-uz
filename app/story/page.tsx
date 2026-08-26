import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { PageTitle } from '@/components/ui/PageTitle';
import { ProcessSection } from '@/components/sections/ProcessSection';
import { StorySection } from '@/components/sections/StorySection';

export const metadata: Metadata = pageMetadata({
  title: 'Tarix',
  description:
    "BARFF tarixi va ishlab chiqarish jarayoni. Sanalar va faktlar mijozdan kutilmoqda.",
  path: '/story',
});

/** `/story` — tarix va ishlab chiqarish jarayoni. */
export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'BARFF', path: '/' }, { name: 'Tarix', path: '/story' }]} />
      <main className="pt-24">
        <PageTitle section="story" />
        <StorySection />
        <ProcessSection />
      </main>
    </>
  );
}
