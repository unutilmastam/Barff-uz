import { Hero } from '@/components/hero/Hero';
import { ProductShowcase } from '@/components/products/ProductShowcase';
import { AboutSection } from '@/components/sections/AboutSection';
import { CategoriesSection } from '@/components/sections/CategoriesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { FruitToBottle } from '@/components/sections/FruitToBottle';
import { KineticMarquee } from '@/components/sections/KineticMarquee';
import { NewsSection } from '@/components/sections/NewsSection';
import { PhilosophySection } from '@/components/sections/PhilosophySection';
import { ProcessSection } from '@/components/sections/ProcessSection';
import { ProductsSection } from '@/components/sections/ProductsSection';
import { ReelsSection } from '@/components/sections/ReelsSection';
import { StorySection } from '@/components/sections/StorySection';
import { VideoSection } from '@/components/sections/VideoSection';
import { WhereToBuy } from '@/components/sections/WhereToBuy';

/**
 * BOSH SAHIFA TARTIBI
 *
 *   01 Hero              06 Philosophy        11 Story
 *   02 Marquee           07 About             12 Process
 *   03 Categories        08 FRUIT → BOTTLE    13 Reels
 *   04 Showcase          09 Video             14 News
 *   05 Products          10 (marquee takror)  15 Where to buy
 *                                             16 Contact
 *
 * FRUIT → BOTTLE spec bo'yicha 08-o'rinda.
 *
 * DIQQAT: to'liq spec hujjati (01–16 ro'yxati) repoda yo'q — tartib bo'lim
 * mantig'iga qarab yig'ilgan va "OCHIQ SAVOLLAR" ga yozib qo'yilgan.
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
      <VideoSection />
      <StorySection />
      <ProcessSection />
      <ReelsSection />
      <NewsSection />
      <WhereToBuy />
      <ContactSection />
    </main>
  );
}
