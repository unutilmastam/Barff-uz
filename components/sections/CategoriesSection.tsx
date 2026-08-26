'use client';

import { HorizontalScroll } from '@/components/animation/HorizontalScroll';
import { TextReveal } from '@/components/animation/TextReveal';
import { CategoryCard } from '@/components/sections/CategoryCard';
import { useLocale } from '@/components/providers/LocaleProvider';
import { categories } from '@/data/categories';

/**
 * Kategoriyalar bo'limi.
 *
 * Desktop: `HorizontalScroll` — bo'lim pin qilinadi va kartalar yon tomonga suriladi.
 * Mobil: oddiy vertikal ro'yxat — touch'da pin qilingan gorizontal scroll noqulay.
 *
 * Ikkala holatda ham bitta `CategoryCard` ishlatiladi, ma'lumot `data/categories.ts` dan.
 */
export function CategoriesSection() {
  const { t } = useLocale();

  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-title">
      <div className="container-barff pt-24 pb-10 md:pt-32">
        <TextReveal as="h2" id="categories-title" type="lines" className="text-section block">
          {t.sections.categories}
        </TextReveal>
      </div>

      {/* Desktop — pin + gorizontal surish.
          Tarmoqlar CSS bilan ajratiladi (media query hook bilan EMAS): hook ishlatilsa
          desktop tarmog'i hydration'dan keyin mount bo'lib sahifa balandligini o'zgartiradi
          va undan keyingi ScrollTrigger'larning boshlanish nuqtalari eskirib qoladi.
          Yashirin tarmoqda pin yaratilmasligini `HorizontalScroll` o'zi tekshiradi. */}
      <div className="hidden md:block">
        <HorizontalScroll className="h-screen" trackClassName="h-screen items-center gap-12 px-[max(20px,calc((100vw-var(--container))/2))]">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              className="h-[68vh] w-[min(80vw,34rem)] shrink-0"
            />
          ))}
        </HorizontalScroll>
      </div>

      {/* Mobil — vertikal, touch-friendly */}
      <ul className="container-barff flex flex-col gap-6 pb-16 md:hidden">
        {categories.map((category) => (
          <li key={category.id} className="flex">
            <CategoryCard category={category} className="min-h-[26rem] w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
