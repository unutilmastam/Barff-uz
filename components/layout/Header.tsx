'use client';

import { gsap } from 'gsap';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Search } from '@/components/ui/Search';
import { mainNavigation } from '@/data/navigation';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DURATION, EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Sayt sarlavhasi.
 *
 * - Tepada shaffof; scroll'dan keyin blur + kichrayadi (`data-scrolled`).
 * - Pastga scroll → yashirinadi, tepaga → qaytadi (GSAP).
 * - Menyu ochiq bo'lsa hech qachon yashirinmaydi.
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { direction, scrolled, atTop } = useScrollDirection();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pathname = usePathname();
  const { t } = useLocale();

  // Sahifa almashganda menyu yopiladi. Effekt emas — render paytida moslashtirish
  // (React hujjatlaridagi namuna), shunda ortiqcha render zanjiri bo'lmaydi.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Animatsiya bir marta quriladi. Har scroll holatida `gsap.context()` ni qayta yaratib
  // `revert()` qilish ishlayotgan tweenni uzib qo'yadi (Header yarim yo'lda qotib qoladi),
  // shuning uchun setter bir marta olinadi va faqat maqsad qiymati o'zgartiriladi.
  const moveTo = useRef<((value: number) => void) | null>(null);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const quickTo = gsap.quickTo(headerRef.current, 'yPercent', {
        duration: prefersReducedMotion ? 0.01 : DURATION.ui,
        ease: EASE.out3,
        overwrite: true,
      });
      moveTo.current = (value: number) => quickTo(value);
    }, headerRef);

    return () => {
      moveTo.current = null;
      context.revert();
    };
  }, [prefersReducedMotion]);

  useLayoutEffect(() => {
    const hidden = direction === 'down' && scrolled && !menuOpen;
    moveTo.current?.(hidden ? -100 : 0);
  }, [direction, scrolled, menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled={scrolled && !atTop ? 'true' : undefined}
        className={cn(
          'fixed inset-x-0 top-0 z-[95] transition-[background-color,backdrop-filter,padding]',
          'duration-[--duration-ui] ease-[--ease-out-power2]',
          'py-6 data-[scrolled]:bg-background/70 data-[scrolled]:py-3 data-[scrolled]:backdrop-blur-md',
        )}
      >
        <div className="container-barff flex items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={t.a11y.home}
            // Tegish maydoni kamida 44px bo'lishi uchun vertikal padding (Phase 9).
            className="font-display -my-3 py-3 text-[1.375rem] leading-none font-extrabold tracking-[-0.02em]"
          >
            BARFF
          </Link>

          <nav aria-label={t.a11y.mainNavigation} className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {mainNavigation.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className={cn(
                      'text-label transition-opacity duration-[--duration-micro] hover:opacity-60',
                      pathname === item.href ? 'opacity-100' : 'opacity-75',
                    )}
                  >
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {/* Qidiruv faqat sichqonchali qurilmalarda (spec: "desktop'da ikonka"). */}
            <Search />
            <LanguageSwitcher className="hidden md:flex" />

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t.a11y.closeMenu : t.a11y.openMenu}
              className="relative z-[95] grid size-11 place-items-center rounded-full transition-colors hover:bg-secondary lg:hidden"
            >
              {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menyu z-90 da, Header z-95 da — toggle tugmasi overlay ustida ko'rinib turadi. */}
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
