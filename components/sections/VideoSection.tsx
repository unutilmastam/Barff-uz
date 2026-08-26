'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Modal } from '@/components/ui/Modal';
import { brandVideo } from '@/data/videos';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Full-width brend videosi.
 *
 * Sahifada muted, avtomatik va loop bo'lib o'ynaydi — ovoz kutilmaganda chiqmasligi
 * uchun (va brauzerlar faqat muted videoni avtoplay qiladi). Klikda to'liq ekran
 * modalida ovoz bilan ochiladi.
 *
 * `data-cursor="play"` — maxsus kursor PLAY holatiga o'tadi (Phase 3).
 *
 * Avtoplay `autoPlay` ATRIBUTI bilan emas, `play()` chaqiruvi bilan boshlanadi:
 * atribut faqat element yuklanayotganda ta'sir qiladi, biz esa uni hydration'dan
 * keyin qo'sha olamiz — natijada video umuman o'ynamay qolardi.
 *
 * Video faqat EKRANDA ko'rinib turganda o'ynaydi (`IntersectionObserver`) —
 * mobil internetga va batareyaga ortiqcha yuk bo'lmaydi. Mobilda va
 * `prefers-reduced-motion` rejimida umuman avtomatik o'ynamaydi: poster qoladi.
 */
export function VideoSection() {
  const [open, setOpen] = useState(false);
  const inlineRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { locale, t } = useLocale();

  useEffect(() => {
    const video = inlineRef.current;
    if (!video) return;

    // Kamaytirilgan animatsiya rejimida yoki mobilda — faqat poster.
    if (prefersReducedMotion) return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            // Brauzer avtoplay'ni rad etsa poster qoladi — xato tashlanmaydi.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  if (!brandVideo) return null;

  return (
    <section aria-labelledby="video-title" className="py-16 md:py-24">
      <h2 id="video-title" className="sr-only">
        {t.sections.video}
      </h2>

      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="play"
        aria-label={t.video.play}
        className="group relative block w-full overflow-hidden"
      >
        <video
          ref={inlineRef}
          src={brandVideo.src}
          poster={brandVideo.poster}
          width={brandVideo.width}
          height={brandVideo.height}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="h-[56vw] max-h-[80vh] w-full object-cover transition-transform duration-[--duration-ui] ease-[--ease-out-power3] group-hover:scale-[1.02]"
        />

        {/* Faqat sichqonchasiz qurilmalarda ko'rinadigan PLAY belgisi:
            desktopda uni maxsus kursor bajaradi. */}
        <span
          aria-hidden="true"
          className="text-label absolute inset-0 grid place-items-center pointer-fine:hidden"
        >
          <span className="bg-background/90 text-foreground rounded-full px-6 py-3">PLAY</span>
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={brandVideo.title[locale]} className="max-w-[min(94vw,72rem)] p-3">
        {/* Modalda ovoz bilan, boshidan. */}
        <video
          src={brandVideo.src}
          poster={brandVideo.poster}
          width={brandVideo.width}
          height={brandVideo.height}
          controls
          autoPlay
          playsInline
          className="h-auto w-full rounded-md"
        />
      </Modal>
    </section>
  );
}
