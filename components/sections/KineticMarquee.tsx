'use client';

import Image from 'next/image';
import { Marquee } from '@/components/sections/Marquee';
import { marqueeIcons, marqueeWord } from '@/data/marquee';

/**
 * Ulkan typography bilan cheksiz kinetik lenta.
 *
 * So'zlar orasida meva ikonkalari — ritm hosil qiladi va lentaning harakati
 * ko'zga tashlanadi. Kontent `data/marquee.ts` dan.
 */
export function KineticMarquee() {
  return (
    <section className="border-line border-y py-8">
      <Marquee className="text-[clamp(3rem,9vw,9rem)] leading-none font-extrabold tracking-[-0.03em]">
        {marqueeIcons.map((icon, index) => (
          <span key={icon.src} className="flex items-center">
            <span className="font-display px-8">{marqueeWord}</span>
            <Image
              src={icon.src}
              alt=""
              aria-hidden="true"
              width={icon.width ?? 320}
              height={icon.height ?? 320}
              sizes="96px"
              className="w-[clamp(2.5rem,6vw,5.5rem)] shrink-0"
              priority={index === 0}
            />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
