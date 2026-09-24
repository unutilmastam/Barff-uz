import Image from 'next/image';
import { Marquee } from '@/motion/Marquee';

/**
 * Ulkan tipografika bilan cheksiz kinetik lenta —
 * 2026-08-26 qurilishidan tiklandi.
 *
 * So'zlar orasida meva maketlari ritm hosil qiladi va lentaning
 * harakati ko'zga tashlanadi.
 *
 * MATN "BARFF" — ya'ni brend nomi, DA'VO emas. Bu yerga "tabiiy",
 * "100% sof" kabi so'zlar YOZILMAYDI: ular mahsulot da'volari va
 * BARFF tasdiqlamaguncha o'ylab topilmaydi (CLAUDE.md §1).
 *
 * Butun bo'lim bezak va `Marquee` ichida `aria-hidden` — ekran
 * o'quvchi uni o'qimaydi va hech narsa yo'qotmaydi.
 */
const ICONS = [
  '/fruits/placeholder-citrus-orange.svg',
  '/fruits/placeholder-apple.svg',
  '/fruits/placeholder-berries.svg',
  '/fruits/placeholder-citrus-lime.svg',
] as const;

export function MarqueeSection() {
  return (
    <section className="border-y border-[var(--color-line)] py-8">
      <Marquee className="font-[family-name:var(--font-display)] text-[clamp(3rem,9vw,9rem)] leading-none font-extrabold tracking-[-0.03em]">
        {ICONS.map((src, index) => (
          <span key={src} className="flex items-center">
            <span className="px-8">BARFF</span>
            <Image
              src={src}
              alt=""
              width={320}
              height={320}
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
