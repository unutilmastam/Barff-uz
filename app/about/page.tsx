import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/seo';
import { PageTitle } from '@/components/ui/PageTitle';
import { AboutSection } from '@/components/sections/AboutSection';
import { PhilosophySection } from '@/components/sections/PhilosophySection';

export const metadata: Metadata = pageMetadata({
  title: 'Brend haqida',
  description:
    "BARFF brendi haqida. Kontent vaqtinchalik — brend matni mijozdan kutilmoqda.",
  path: '/about',
});

/**
 * `/about` — brend haqida.
 * Bosh sahifadagi bo'limlar QAYTA ISHLATILADI: matn bitta joyda (`data/about.ts`)
 * turadi, ikki nusxa saqlanmaydi.
 */
export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'BARFF', path: '/' }, { name: 'Brend haqida', path: '/about' }]} />
      <main className="pt-24">
        <PageTitle section="about" />
        <AboutSection />
        <PhilosophySection />
      </main>
    </>
  );
}
