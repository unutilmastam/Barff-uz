'use client';

import { TextReveal } from '@/components/animation/TextReveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { MagneticButton } from '@/components/animation/MagneticButton';
import { stores } from '@/data/stores';
import { CONTENT_PENDING } from '@/lib/content';

/**
 * "FIND YOUR BARFF" — sotuv nuqtalari.
 *
 * Ro'yxat mijozdan keladi. Bo'sh bo'lsa do'kon nomi yoki manzil O'YLAB TOPILMAYDI:
 * o'rniga nima yetishmayotgani ko'rsatiladi.
 */
export function WhereToBuy() {
  const { t } = useLocale();

  return (
    <section
      aria-labelledby="where-title"
      className="border-line border-y py-24 md:py-32"
    >
      <div className="container-barff flex flex-col items-start gap-8">
        <p id="where-title" className="text-label text-muted">
          {t.sections.whereToBuy}
        </p>

        <TextReveal as="p" type="lines" className="text-section block">
          {t.whereToBuy.cta}
        </TextReveal>

        {stores.length > 0 ? (
          <ul className="grid w-full gap-6 md:grid-cols-3">
            {stores.map((store) => (
              <li key={store.id} className="border-line flex flex-col gap-1 border-t pt-4">
                <span className="font-display text-lg font-bold">{store.name}</span>
                <span className="text-muted text-sm">{store.address}</span>
                {store.city && <span className="text-muted text-sm">{store.city}</span>}
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="text-sm hover:opacity-60">
                    {store.phone}
                  </a>
                )}
                {store.mapUrl && (
                  <a
                    href={store.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-label mt-2 hover:opacity-60"
                  >
                    MAP ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-line text-muted w-full rounded-lg border border-dashed p-8">
            <p className="text-label mb-2">{CONTENT_PENDING}</p>
            <p className="text-sm">{t.whereToBuy.pending}</p>
          </div>
        )}

        <MagneticButton
          className="bg-primary text-primary-foreground text-label rounded-full px-10 py-5"
          aria-label={t.whereToBuy.cta}
        >
          {t.hero.cta}
        </MagneticButton>
      </div>
    </section>
  );
}
