import Image from 'next/image';
import { getCutout } from '@/lib/cutouts';
import { Marquee } from '@/motion/Marquee';

/**
 * Ulkan tipografika bilan cheksiz kinetik lenta.
 *
 * So'zlar orasida BARFF'ning HAQIQIY shishalari (fonsiz kesilgan fotosurat)
 * turadi va lentaning harakati ko'zga tashlanadi. Avval bu yerda meva
 * maketlari edi.
 *
 * MATN "BARFF" — ya'ni brend nomi, DA'VO emas. Bu yerga "tabiiy",
 * "100% sof" kabi so'zlar YOZILMAYDI: ular mahsulot da'volari va
 * BARFF tasdiqlamaguncha o'ylab topilmaydi (CLAUDE.md §1).
 *
 * Butun bo'lim bezak va `Marquee` ichida `aria-hidden` — ekran
 * o'quvchi uni o'qimaydi va hech narsa yo'qotmaydi.
 */
const BOTTLES = [
  'anor-sharbati-350',
  'olma-sharbati-350',
  'mango-sharbati-350',
  'olcha-sharbati-350',
  'apelsin-sharbati-350',
  'shaftoli-sharbati-350',
] as const;

export function MarqueeSection() {
  return (
    <section className="overflow-hidden border-y border-[var(--color-line)] py-8">
      <Marquee className="font-[family-name:var(--font-display)] text-[clamp(3rem,9vw,9rem)] leading-none font-extrabold tracking-[-0.03em]">
        {BOTTLES.map((slug, index) => {
          const cutout = getCutout(slug);

          return (
            <span key={slug} className="flex items-center">
              <span className="px-8">BARFF</span>
              {cutout !== null && (
                <Image
                  src={cutout.src}
                  alt=""
                  width={cutout.width}
                  height={cutout.height}
                  sizes="160px"
                  className="h-[clamp(5rem,13vw,12rem)] w-auto shrink-0 -rotate-6 drop-shadow-[0_18px_24px_rgba(0,0,0,0.25)]"
                  priority={index === 0}
                />
              )}
            </span>
          );
        })}
      </Marquee>
    </section>
  );
}
