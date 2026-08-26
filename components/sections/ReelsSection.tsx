'use client';

import { useRef } from 'react';
import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { reels } from '@/data/videos';
import type { VideoAsset } from '@/lib/types';

function ReelCard({ reel }: { reel: VideoAsset }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { locale } = useLocale();

  // Hover'da ovozsiz o'ynaydi, chiqib ketilganda boshiga qaytadi.
  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Avtoplay taqiqlangan bo'lsa poster qoladi — xato tashlanmaydi.
    });
  };

  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <div
      data-reel
      data-cursor="play"
      onMouseEnter={play}
      onMouseLeave={stop}
      className="border-line relative aspect-[9/16] w-[68vw] shrink-0 snap-center overflow-hidden rounded-lg border sm:w-[42vw] md:w-[min(26vw,18rem)]"
    >
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        width={reel.width}
        height={reel.height}
        muted
        loop
        playsInline
        preload="none"
        aria-label={reel.title[locale]}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * 9:16 vertikal lavhalar.
 *
 * Desktop: hover'da ovozsiz playback (spec talabi) — kursor PLAY holatiga o'tadi.
 * Mobil: `snap` bilan barmoq surish. Bu yerda GSAP pin ISHLATILMAYDI: touch'da
 * pin qilingan gorizontal scroll noqulay, oddiy swipe tabiiyroq.
 *
 * `preload="none"` — 4 ta video bir vaqtda yuklanmaydi (mobil internetni ayaydi).
 */
export function ReelsSection() {
  const { t } = useLocale();

  if (reels.length === 0) return null;

  return (
    <section aria-labelledby="reels-title" className="py-24 md:py-32">
      <div className="container-barff mb-10">
        <TextReveal as="h2" id="reels-title" type="lines" className="text-section block">
          {t.sections.reels}
        </TextReveal>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(20px,calc((100vw-var(--container))/2))] pb-4 md:gap-6">
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    </section>
  );
}
