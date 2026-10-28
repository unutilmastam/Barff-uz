'use client';

import { useState } from 'react';
import { type PublicImage } from '@barff/types';
import { ApiImage } from '@/components/media/ApiImage';
import { type Cutout } from '@/lib/cutouts';
import { Tilt3D } from '@/motion/Tilt3D';
import { CutoutMedia } from './CutoutMedia';

export interface GalleryPhoto {
  image: PublicImage;
  alt: string;
}

export interface GalleryLabels {
  /** Asosiy (fonsiz) ko'rinish tugmasi. */
  main: string;
  /** `{n}` — surat tartib raqami. */
  photo: string;
  region: string;
}

/**
 * Mahsulot galereyasi: katta ko'rinish + almashtiriladigan kichik suratlar.
 *
 * Birinchi ko'rinish — fonsiz 3D shisha (kesilgan surat bo'lsa); qolganlari
 * — haqiqiy fotosuratlar (old, orqa, yotgan). Avval kichik suratlar
 * bosilmas edi va faqat bezak bo'lib turardi.
 *
 * Tugmalar `aria-pressed` bilan: ekran o'quvchi qaysi biri tanlanganini
 * biladi; klaviatura bilan Tab/Enter ishlaydi.
 */
export function ProductGallery({
  name,
  cutout,
  photos,
  labels,
}: {
  name: string;
  cutout: Cutout | null;
  photos: GalleryPhoto[];
  labels: GalleryLabels;
}) {
  // -1 — fonsiz ko'rinish; 0.. — fotosurat indeksi.
  const [selected, setSelected] = useState(cutout !== null ? -1 : 0);

  const showing = selected >= 0 ? photos[selected] : undefined;
  const entries: { key: string; index: number; label: string }[] = [
    ...(cutout !== null ? [{ key: 'main', index: -1, label: labels.main }] : []),
    ...photos.map((_, index) => ({
      key: `photo-${index}`,
      index,
      label: labels.photo.replace('{n}', String(index + 1)),
    })),
  ];

  return (
    <div role="group" aria-label={labels.region}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card,1.5rem)] border border-[var(--color-line)]">
        {selected === -1 && cutout !== null ? (
          <Tilt3D className="relative h-full w-full">
            <CutoutMedia
              cutout={cutout}
              alt={name}
              priority
              sizes="(max-width: 1024px) 90vw, 560px"
            />
          </Tilt3D>
        ) : showing !== undefined ? (
          <ApiImage
            image={showing.image}
            alt={showing.alt}
            sizes="(max-width: 1024px) 90vw, 560px"
            className="h-full w-full bg-[var(--color-ink-800)] object-contain"
          />
        ) : null}
      </div>

      {entries.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3">
          {entries.map((entry) => {
            const pressed = entry.index === selected;
            const photo = entry.index >= 0 ? photos[entry.index] : undefined;

            return (
              <li key={entry.key}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-label={entry.label}
                  onClick={() => setSelected(entry.index)}
                  className={`relative aspect-square w-full overflow-hidden rounded-2xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    pressed
                      ? 'border-[var(--color-fg)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-fg-subtle)]'
                  }`}
                >
                  {entry.index === -1 && cutout !== null ? (
                    <div
                      className="grid h-full w-full place-items-center bg-[var(--color-ink-800)]"
                      style={{
                        backgroundImage: `radial-gradient(60% 60% at 50% 55%, ${cutout.glow}66, ${cutout.glow}00 75%)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- kichik statik kesilgan surat */}
                      <img
                        src={cutout.src}
                        alt=""
                        width={cutout.width}
                        height={cutout.height}
                        loading="lazy"
                        className="h-[86%] w-auto"
                      />
                    </div>
                  ) : photo !== undefined ? (
                    <ApiImage
                      image={photo.image}
                      alt=""
                      sizes="120px"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
