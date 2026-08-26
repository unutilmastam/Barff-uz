import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui/PageTitle';
import { AboutSection } from '@/components/sections/AboutSection';
import { PhilosophySection } from '@/components/sections/PhilosophySection';

export const metadata: Metadata = { title: 'BARFF — About' };

/**
 * `/about` — brend haqida.
 * Bosh sahifadagi bo'limlar QAYTA ISHLATILADI: matn bitta joyda (`data/about.ts`)
 * turadi, ikki nusxa saqlanmaydi.
 */
export default function Page() {
  return (
    <main className="pt-24">
      <PageTitle section="about" />
      <AboutSection />
      <PhilosophySection />
    </main>
  );
}
