import { Hero } from '@/components/hero/Hero';
import { ProductShowcase } from '@/components/products/ProductShowcase';
import { AboutSection } from '@/components/sections/AboutSection';
import { CategoriesSection } from '@/components/sections/CategoriesSection';
import { FruitToBottle } from '@/components/sections/FruitToBottle';
import { KineticMarquee } from '@/components/sections/KineticMarquee';
import { PhilosophySection } from '@/components/sections/PhilosophySection';
import { ProcessSection } from '@/components/sections/ProcessSection';
import { ProductsSection } from '@/components/sections/ProductsSection';
import { StorySection } from '@/components/sections/StorySection';

/**
 * Bosh sahifa tartibi:
 *   01 Hero · 02 Marquee · 03 Categories · 04 Showcase · 05 Products
 *   06 Philosophy · 07 About · 08 FRUIT → BOTTLE · 09 Story · 10 Process
 *
 * Video / Reels / News / WhereToBuy / Contact — Phase 7 da qo'shiladi.
 */
export default function HomePage() {
  return (
    <main>
      <Hero />
      <KineticMarquee />
      <CategoriesSection />
      <ProductShowcase />
      <ProductsSection />
      <PhilosophySection />
      <AboutSection />
      <FruitToBottle />
      <StorySection />
      <ProcessSection />
    </main>
  );
}
