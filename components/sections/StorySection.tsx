'use client';

import { HorizontalScroll } from '@/components/animation/HorizontalScroll';
import { Reveal } from '@/components/animation/Reveal';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { milestones } from '@/data/story';
import { CONTENT_PENDING } from '@/lib/content';
import type { Milestone } from '@/lib/types';

function MilestoneCard({ milestone, isLast }: { milestone: Milestone; isLast: boolean }) {
  const { locale } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      {/* Chiziq va nuqta — bosqichlar ketma-ketligini ko'rsatadi. */}
      <div aria-hidden="true" className="relative flex items-center">
        <span className="bg-foreground block size-3 shrink-0 rounded-full" />
        {!isLast && <span className="bg-line block h-px flex-1" />}
      </div>

      <p className="font-display text-[clamp(1.5rem,2.6vw,2.25rem)] leading-none font-bold tracking-[-0.02em]">
        {milestone.year ?? <span className="text-muted text-label">{CONTENT_PENDING}</span>}
      </p>
      <h3 className="text-label">{milestone.title[locale]}</h3>
      <p className="text-muted max-w-[36ch] text-sm">{milestone.description[locale]}</p>
    </div>
  );
}

/**
 * Tarix chizig'i.
 *
 * Desktop: gorizontal — vaqt o'qi yon tomonga cho'ziladi (pin + scroll).
 * Mobil: vertikal ro'yxat — tor ekranda gorizontal o'q o'qilmaydi.
 *
 * SANALAR o'ylab topilmaydi: `year` bo'sh bo'lsa `[CLIENT CONTENT REQUIRED]` ko'rinadi.
 */
export function StorySection() {
  const { t } = useLocale();

  if (milestones.length === 0) return null;

  return (
    <section aria-labelledby="story-title">
      <div className="container-barff pt-24 pb-10 md:pt-32">
        <TextReveal as="h2" id="story-title" type="lines" className="text-section block">
          {t.sections.story}
        </TextReveal>
      </div>

      {/* Desktop — gorizontal vaqt o'qi. Tarmoqlar CSS bilan ajratiladi (hydration'da
          layout o'zgarmasligi uchun); yashirin tarmoqda pin qurilmaydi. */}
      <div className="hidden md:block">
        <HorizontalScroll
          className="h-screen"
          trackClassName="h-screen items-center gap-20 px-[max(20px,calc((100vw-var(--container))/2))]"
        >
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="w-[min(84vw,32rem)] shrink-0">
              <MilestoneCard milestone={milestone} isLast={index === milestones.length - 1} />
            </div>
          ))}
        </HorizontalScroll>
      </div>

      {/* Mobil — vertikal */}
      <Reveal as="ul" className="container-barff flex flex-col gap-10 pb-16 md:hidden">
        {milestones.map((milestone, index) => (
          <li key={milestone.id}>
            <MilestoneCard milestone={milestone} isLast={index === milestones.length - 1} />
          </li>
        ))}
      </Reveal>
    </section>
  );
}
