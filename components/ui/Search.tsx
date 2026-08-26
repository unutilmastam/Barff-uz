'use client';

import { Search as SearchIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { news } from '@/data/news';
import { products } from '@/data/products';
import { useAnimatedPresence } from '@/hooks/useAnimatedPresence';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useIsClient } from '@/hooks/useIsClient';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap } from '@/lib/gsap';
import { DURATION, EASE } from '@/lib/motion';
import { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/** Qidiruv natijalari soni — overlay ro'yxatga aylanib ketmasligi uchun. */
const MAX_RESULTS = 5;

const CLIP_CLOSED = 'inset(0% 0% 100% 0%)';
const CLIP_OPEN = 'inset(0% 0% 0% 0%)';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * To'liq ekran qidiruv overlayi.
 *
 * Natijada MAHSULOT va YANGILIK birga chiqadi (spec talabi). Qidiruv joriy tildagi
 * nom va tavsif bo'yicha ishlaydi — foydalanuvchi ko'rgan matnini qidiradi.
 * Escape yopadi, fokus ichida ushlanadi, sahifa scroll'i bloklanadi.
 */
function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isClient = useIsClient();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { rendered, onExited } = useAnimatedPresence(isOpen);
  const { locale, t } = useLocale();

  useFocusTrap(rootRef, isOpen && rendered);
  useLockBodyScroll(isOpen);

  const term = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!term) return { products: [], news: [] };

    const matches = (...values: string[]) =>
      values.some((value) => value.toLowerCase().includes(term));

    return {
      products: products
        .filter((product) => matches(product.name[locale], product.description[locale]))
        .slice(0, MAX_RESULTS),
      news: news
        .filter((item) => matches(item.title[locale], item.excerpt[locale]))
        .slice(0, MAX_RESULTS),
    };
  }, [term, locale]);

  useLayoutEffect(() => {
    if (!rendered) return;

    const context = gsap.context(() => {
      const duration = prefersReducedMotion ? 0.01 : DURATION.ui;

      if (isOpen) {
        gsap
          .timeline({ onComplete: () => inputRef.current?.focus() })
          .fromTo(
            rootRef.current,
            { clipPath: CLIP_CLOSED },
            { clipPath: CLIP_OPEN, duration, ease: EASE.out4 },
          );
      } else {
        gsap.timeline({ onComplete: onExited }).to(rootRef.current, {
          clipPath: CLIP_CLOSED,
          duration: duration * 0.8,
          ease: EASE.out4,
        });
      }
    }, rootRef);

    return () => context.revert();
  }, [isOpen, rendered, onExited, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isClient || !rendered) return null;

  const total = results.products.length + results.news.length;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.search.placeholder}
      className="bg-background fixed inset-0 z-[120] flex flex-col"
      style={{ clipPath: CLIP_CLOSED }}
    >
      <div className="container-barff flex flex-1 flex-col gap-10 pt-28 pb-16">
        <div className="flex items-center gap-6">
          <SearchIcon size={24} aria-hidden="true" className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.search.placeholder}
            className="font-display placeholder:text-muted w-full border-none bg-transparent text-[clamp(1.75rem,5vw,4rem)] font-bold tracking-[-0.03em] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.search.close}
            className="hover:bg-secondary grid size-11 shrink-0 place-items-center rounded-full transition-colors"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div aria-live="polite" className="flex flex-1 flex-col gap-10 overflow-y-auto">
          {!term && <p className="text-muted text-label">{t.search.hint}</p>}
          {term && total === 0 && <p className="text-muted text-label">{t.search.empty}</p>}

          {results.products.length > 0 && (
            <section>
              <h2 className="text-label text-muted mb-4">{t.search.products}</h2>
              <ul className="flex flex-col">
                {results.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={onClose}
                      className="border-line block border-b py-4 text-2xl transition-opacity hover:opacity-60"
                    >
                      {product.name[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.news.length > 0 && (
            <section>
              <h2 className="text-label text-muted mb-4">{t.search.news}</h2>
              <ul className="flex flex-col">
                {results.news.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/news/${item.slug}`}
                      onClick={onClose}
                      className="border-line block border-b py-4 text-2xl transition-opacity hover:opacity-60"
                    >
                      {item.title[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Header'dagi qidiruv tugmasi + overlay. */
export function Search() {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.search.open}
        aria-expanded={open}
        className="hover:bg-secondary hidden size-11 place-items-center rounded-full transition-colors pointer-fine:grid"
      >
        <SearchIcon size={20} aria-hidden="true" />
      </button>

      <SearchOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
