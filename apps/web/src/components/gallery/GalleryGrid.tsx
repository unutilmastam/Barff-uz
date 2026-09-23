'use client';

import { type Locale, type PublicGalleryItem } from '@barff/types';
import { Dialog, MediaFrame } from '@barff/ui';
import { useCallback, useEffect, useState } from 'react';
import { ApiImage } from '@/components/media/ApiImage';
import { type Messages } from '@/i18n/dictionary';
import { text } from '@/lib/localized';

/**
 * Galereya to'ri va rasm ko'ruvchi.
 *
 * Mijoz komponenti — ko'ruvchini ochish holat talab qiladi. Rasmlarning
 * O'ZI serverdan kelgan ma'lumotdan chiziladi, ya'ni JavaScript
 * yuklanmasa ham to'r ko'rinadi.
 *
 * Yuklash: `ApiImage` standart holatda `loading="lazy"` beradi, shuning
 * uchun ekrandan tashqaridagi rasmlar yuklanmaydi.
 */
export function GalleryGrid({
  items,
  locale,
  messages,
}: {
  items: PublicGalleryItem[];
  locale: Locale;
  messages: Messages;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        // Aylanma: oxirgidan keyin birinchisi.
        return (current + delta + items.length) % items.length;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return undefined;

    const onKey = (event: KeyboardEvent) => {
      // `Escape` ni Radix o'zi bajaradi; bu yerda faqat siljish.
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, move]);

  const active = openIndex !== null ? items[openIndex] : undefined;
  const caption = active !== undefined ? text(active.caption, locale) : '';

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group w-full cursor-zoom-in text-left"
              // Tugma nomi rasm tavsifidan quriladi.
              aria-label={`${messages.gallery.open}: ${text(
                item.caption,
                locale,
                `${messages.gallery.counter} ${index + 1}`,
              )}`}
            >
              <MediaFrame ratio="square">
                {item.image !== null && (
                  <ApiImage
                    image={item.image}
                    alt={text(item.caption, locale)}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px"
                    className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                  />
                )}
              </MediaFrame>
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null);
        }}
        size="wide"
        hideTitle
        title={caption.length > 0 ? caption : messages.gallery.title}
        closeLabel={messages.gallery.close}
      >
        {active?.image != null && (
          <figure className="flex flex-col gap-4">
            <ApiImage
              image={active.image}
              alt={caption}
              sizes="90vw"
              priority
              className="max-h-[70vh] w-full object-contain"
            />

            <figcaption className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <span className="text-[var(--color-fg-muted)]">{caption}</span>

              <span className="flex items-center gap-2">
                <span className="tabular-nums text-[var(--color-fg-subtle)]">
                  {(openIndex ?? 0) + 1} / {items.length}
                </span>

                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label={messages.gallery.previous}
                  className="rounded-md border border-[var(--color-line-strong)] px-3 py-1.5 transition-colors hover:bg-[var(--color-glass)]"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label={messages.gallery.next}
                  className="rounded-md border border-[var(--color-line-strong)] px-3 py-1.5 transition-colors hover:bg-[var(--color-glass)]"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </span>
            </figcaption>
          </figure>
        )}
      </Dialog>
    </>
  );
}
