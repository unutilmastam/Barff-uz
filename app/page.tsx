import { Hero } from '@/components/hero/Hero';
import { ProductShowcase } from '@/components/products/ProductShowcase';
import { CategoriesSection } from '@/components/sections/CategoriesSection';
import { KineticMarquee } from '@/components/sections/KineticMarquee';
import { ProductsSection } from '@/components/sections/ProductsSection';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <KineticMarquee />
      <CategoriesSection />
      <ProductShowcase />
      <ProductsSection />
      {/* Philosophy / About / Story / Process — Phase 6 da qo'shiladi. */}
    </main>
  );
}
