import Image from 'next/image';
import { type Cutout } from '@/lib/cutouts';

/**
 * Fonsiz shisha: orqa yorug'lik (mahsulot rangidan) + yengil suzish + soya.
 *
 * Yorug'lik — BEZAK: u matn rangi emas (CLAUDE.md §16), faqat fon.
 * `data-tilt-lift`: `Tilt3D` ichida bo'lsa kartochkadan ko'tariladi.
 */
export function CutoutMedia({
  cutout,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  cutout: Cutout;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[var(--color-ink-800)] ${className}`}
      style={{
        backgroundImage: `radial-gradient(70% 58% at 50% 60%, ${cutout.glow}59, ${cutout.glow}00 72%)`,
      }}
    >
      {/* Poldagi soya — shisha "turib" turgandek. */}
      <div
        aria-hidden
        className="absolute bottom-[7%] left-1/2 h-[5%] w-[58%] -translate-x-1/2 rounded-full bg-black/25 blur-md"
      />

      <div data-tilt-lift className="absolute inset-0 px-[12%] pt-[7%] pb-[11%]">
        {/* `fill` + `object-contain`: shisha qutiga HAR DOIM to'liq sig'adi. */}
        <div className="relative h-full w-full">
          <Image
            src={cutout.src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className="barff-float object-contain drop-shadow-[0_22px_22px_rgba(0,0,0,0.28)]"
          />
        </div>
      </div>
    </div>
  );
}
