import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui/PageTitle';
import { ProcessSection } from '@/components/sections/ProcessSection';
import { StorySection } from '@/components/sections/StorySection';

export const metadata: Metadata = { title: 'BARFF — Story' };

/** `/story` — tarix va ishlab chiqarish jarayoni. */
export default function Page() {
  return (
    <main className="pt-24">
      <PageTitle section="story" />
      <StorySection />
      <ProcessSection />
    </main>
  );
}
