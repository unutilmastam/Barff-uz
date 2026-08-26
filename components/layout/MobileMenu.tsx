'use client';

import { gsap } from 'gsap';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLocale } from '@/components/providers/LocaleProvider';
import { mainNavigation } from '@/data/navigation';
import { socialLinks } from '@/data/social';
import { useAnimatedPresence } from '@/hooks/useAnimatedPresence';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DURATION, EASE, STAGGER } from '@/lib/motion';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLIP_CLOSED = 'inset(0% 0% 100% 0%)';
const CLIP_OPEN = 'inset(0% 0% 0% 0%)';

/**
 * To'liq ekran menyu (side drawer EMAS).
 *
 * Ochilishi: clip-path pastdan yuqoriga → havolalar stagger bilan chiqadi.
 * Havolalar `data/navigation.ts` dan, matni tarjimadan olinadi.
 */
export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { rendered, onExited } = useAnimatedPresence(isOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useLocale();

  useFocusTrap(rootRef, isOpen && rendered);
  useLockBodyScroll(isOpen);

  useLayoutEffect(() => {
    if (!rendered) return;

    const context = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-menu-item]');
      const duration = prefersReducedMotion ? 0.01 : DURATION.ui;

      if (isOpen) {
        gsap
          .timeline()
          .fromTo(
            rootRef.current,
            { clipPath: CLIP_CLOSED },
            { clipPath: CLIP_OPEN, duration, ease: EASE.out4 },
          )
          .fromTo(
            items,
            { yPercent: prefersReducedMotion ? 0 : 110, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: prefersReducedMotion ? 0.01 : DURATION.section * 0.7,
              ease: EASE.out3,
              stagger: prefersReducedMotion ? 0 : STAGGER.text,
            },
            '-=0.25',
          );
      } else {
        gsap.timeline({ onComplete: onExited }).to(rootRef.current, {
          clipPath: CLIP_CLOSED,
          duration: prefersReducedMotion ? 0.01 : DURATION.ui * 0.8,
          ease: EASE.out4,
        });
      }
    }, rootRef);

    return () => context.revert();
  }, [isOpen, rendered, onExited, prefersReducedMotion]);

  if (!rendered) return null;

  return (
    <div
      ref={rootRef}
      id="mobile-menu"
      className="fixed inset-0 z-[90] flex flex-col bg-background"
      style={{ clipPath: CLIP_CLOSED }}
    >
      <div className="container-barff flex flex-1 flex-col justify-center gap-12 pt-28 pb-16">
        <nav aria-label={t.a11y.mainNavigation}>
          <ul className="flex flex-col gap-2">
            {mainNavigation.map((item) => (
              <li key={item.id} className="overflow-hidden">
                <Link
                  href={item.href}
                  onClick={onClose}
                  data-menu-item
                  className="text-section block py-1 transition-opacity duration-[--duration-micro] hover:opacity-60"
                >
                  {t.nav[item.labelKey]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-8">
          {socialLinks.length > 0 && (
            <div data-menu-item>
              <p className="text-label text-muted mb-3">{t.menu.social}</p>
              <ul className="flex flex-col gap-1">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body transition-opacity hover:opacity-60"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div data-menu-item>
            <p className="text-label text-muted mb-3">{t.menu.language}</p>
            <LanguageSwitcher size="stacked" />
          </div>
        </div>
      </div>
    </div>
  );
}
