'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { values } from '@/data/philosophy';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fadeUp } from '@/lib/animations';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE } from '@/lib/motion';

/**
 * Falsafa — 4 ta brend qiymati ro'yxati.
 *
 * Hover'da uchta narsa birga sodir bo'ladi (13-qoida: har harakatning UX sababi bor):
 *   1. rasm ochiladi va kursor ortidan yuradi — qiymatni vizual bilan bog'laydi;
 *   2. matn o'ngga siljiydi — qaysi qator faolligini ko'rsatadi;
 *   3. strelka aylanadi — bosilsa nima bo'lishini emas, faollikni bildiradi.
 *
 * Rasm faqat sichqonchali qurilmalarda: touch'da hover holati yo'q, u yerda
 * ro'yxat oddiy va o'qiladigan bo'lib qoladi.
 */
export function PhilosophySection() {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { locale, t } = useLocale();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      fadeUp('[data-value-row]', { reduced: prefersReducedMotion, trigger: root });

      if (prefersReducedMotion) return;

      const media = gsap.matchMedia();
      media.add('(hover: hover) and (pointer: fine)', () => {
        const preview = root.querySelector<HTMLElement>('[data-value-preview]');
        if (!preview) return;

        // Rasm faqat VERTIKAL ravishda kursor ortidan yuradi. Kursor markazida tursa
        // qiymat matnini bekitib qo'yardi — shuning uchun u bo'limning bo'sh o'ng
        // tomoniga bog'langan (matn chapda, tavsif maks 52ch).
        const moveY = gsap.quickTo(preview, 'y', { duration: DURATION.ui, ease: EASE.out3 });

        const onMove = (event: MouseEvent) => {
          const bounds = root.getBoundingClientRect();
          moveY(event.clientY - bounds.top);
        };

        const rows = gsap.utils.toArray<HTMLElement>('[data-value-row]');
        const cleanups = rows.map((row) => {
          const index = row.dataset.valueIndex ?? '0';
          const image = preview.querySelector<HTMLElement>(`[data-preview-image="${index}"]`);

          const onEnter = () => {
            gsap.to(preview, { autoAlpha: 1, duration: DURATION.micro, ease: EASE.out2 });
            gsap.to(preview.querySelectorAll('[data-preview-image]'), {
              autoAlpha: 0,
              duration: DURATION.micro,
            });
            if (image) {
              gsap.fromTo(
                image,
                { autoAlpha: 0, scale: 1.1 },
                { autoAlpha: 1, scale: 1, duration: DURATION.ui, ease: EASE.out4 },
              );
            }
          };

          const onLeave = () => {
            gsap.to(preview, { autoAlpha: 0, duration: DURATION.micro, ease: EASE.out2 });
          };

          row.addEventListener('mouseenter', onEnter);
          row.addEventListener('mouseleave', onLeave);
          return () => {
            row.removeEventListener('mouseenter', onEnter);
            row.removeEventListener('mouseleave', onLeave);
          };
        });

        root.addEventListener('mousemove', onMove);
        return () => {
          root.removeEventListener('mousemove', onMove);
          cleanups.forEach((cleanup) => cleanup());
        };
      });
    }, root);

    return () => context.revert();
  }, [prefersReducedMotion]);

  if (values.length === 0) return null;

  return (
    <section
      ref={rootRef}
      aria-labelledby="philosophy-title"
      className="relative overflow-hidden py-24 md:py-32"
    >
      <div className="container-barff">
        <TextReveal as="h2" id="philosophy-title" type="lines" className="text-section mb-14 block">
          {t.sections.philosophy}
        </TextReveal>

        <ul className="border-line border-t">
          {values.map((value, index) => (
            <li key={value.id}>
              <div
                data-value-row
                data-value-index={index}
                data-cursor="view"
                className="group border-line flex items-center gap-6 border-b py-8 md:py-10"
              >
                <span className="text-label text-muted w-10 shrink-0 tabular-nums">
                  {value.index}
                </span>

                {/* Matn siljishi — faol qatorni ko'rsatadi. */}
                <div className="flex flex-1 flex-col gap-1 transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:translate-x-4">
                  <h3 className="font-display text-[clamp(1.5rem,3.2vw,2.75rem)] leading-tight font-bold tracking-[-0.02em]">
                    {value.title[locale]}
                  </h3>
                  <p className="text-muted max-w-[52ch] text-sm">{value.description[locale]}</p>
                </div>

                <span
                  aria-hidden="true"
                  className="text-muted shrink-0 text-2xl transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:text-foreground group-hover:rotate-45"
                >
                  ↗
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Kursor ortidan yuradigan rasm — faqat desktop. */}
      <div
        data-value-preview
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 right-[10%] z-20 hidden -translate-y-1/2 opacity-0 pointer-fine:block"
      >
        <div className="relative h-48 w-48">
          {values.map((value, index) =>
            value.image ? (
              <Image
                key={value.id}
                data-preview-image={index}
                src={value.image.src}
                alt=""
                width={320}
                height={320}
                sizes="160px"
                className="absolute inset-0 h-full w-full object-contain opacity-0"
              />
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}
