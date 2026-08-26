'use client';

import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { aboutLines } from '@/data/about';

/**
 * Katta editorial matn.
 *
 * Har qator maska ostidan pastdan ko'tarilib chiqadi — `TextReveal` `SplitText` ning
 * `mask` rejimini ishlatadi, ya'ni clip-path + transform. Faqat `opacity` bilan
 * ochish TAQIQLANGAN (spec talabi): u qatorlarga og'irlik bermaydi.
 */
export function AboutSection() {
  const { locale, t } = useLocale();

  if (aboutLines.length === 0) return null;

  return (
    <section aria-labelledby="about-title" className="container-barff py-24 md:py-32">
      <p id="about-title" className="text-label text-muted mb-10">
        {t.sections.about}
      </p>

      <div className="flex flex-col gap-3">
        {aboutLines.map((line, index) => (
          <TextReveal
            key={line.uz}
            as="p"
            type="lines"
            delay={index * 0.05}
            className="font-display block text-[clamp(1.75rem,4.6vw,4rem)] leading-[1.08] font-bold tracking-[-0.03em]"
          >
            {line[locale]}
          </TextReveal>
        ))}
      </div>
    </section>
  );
}
