import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui/PageTitle';
import { ContactSection } from '@/components/sections/ContactSection';
import { WhereToBuy } from '@/components/sections/WhereToBuy';

export const metadata: Metadata = { title: 'BARFF — Contact' };

/** `/contact` — aloqa formasi va sotuv nuqtalari. */
export default function Page() {
  return (
    <main className="pt-24">
      <PageTitle section="contact" />
      <ContactSection />
      <WhereToBuy />
    </main>
  );
}
