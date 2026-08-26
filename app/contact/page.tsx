import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { PageTitle } from '@/components/ui/PageTitle';
import { ContactSection } from '@/components/sections/ContactSection';
import { WhereToBuy } from '@/components/sections/WhereToBuy';

export const metadata: Metadata = pageMetadata({
  title: 'Aloqa',
  description:
    "BARFF bilan bog'lanish. Aloqa ma'lumotlari va sotuv nuqtalari mijozdan kutilmoqda.",
  path: '/contact',
});

/** `/contact` — aloqa formasi va sotuv nuqtalari. */
export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'BARFF', path: '/' }, { name: 'Aloqa', path: '/contact' }]} />
      <main className="pt-24">
        <PageTitle section="contact" />
        <ContactSection />
        <WhereToBuy />
      </main>
    </>
  );
}
