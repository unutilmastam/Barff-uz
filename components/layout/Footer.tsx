'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLocale } from '@/components/providers/LocaleProvider';
import { footerNavigation, mainNavigation } from '@/data/navigation';
import { socialLinks } from '@/data/social';

/**
 * Footer: ulkan BARFF logotipi + navigatsiya + faqat MAVJUD ijtimoiy havolalar.
 *
 * Havolalar `data/` dan o'qiladi. Bo'sh ro'yxat hech qachon soxta havola bilan
 * to'ldirilmaydi — o'rniga mijozdan nima kutilayotgani ko'rsatiladi.
 */
export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-line border-t pt-20 pb-10">
      <div className="container-barff flex flex-col gap-16">
        <div className="flex flex-wrap justify-between gap-12">
          <nav aria-label={t.a11y.footerNavigation}>
            <p className="text-label text-muted mb-4">{t.footer.navigation}</p>
            <ul className="flex flex-col gap-2">
              {mainNavigation.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-body transition-opacity duration-[--duration-micro] hover:opacity-60"
                  >
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socialLinks.length > 0 && (
            <div>
              <p className="text-label text-muted mb-4">{t.footer.social}</p>
              <ul className="flex flex-col gap-2">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body transition-opacity duration-[--duration-micro] hover:opacity-60"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-label text-muted mb-4">{t.footer.language}</p>
            <LanguageSwitcher size="stacked" className="-ml-3" />
          </div>
        </div>

        {/* Ulkan logotip. Mijozdan SVG kelgach shu matn logotip bilan almashtiriladi. */}
        <p
          aria-hidden="true"
          className="font-display w-full text-center text-[clamp(4rem,19vw,20rem)] leading-[0.8] font-extrabold tracking-[-0.04em] select-none"
        >
          BARFF
        </p>

        <div className="border-line text-label text-muted flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p>
            © {year} BARFF. {t.footer.rights}
          </p>
          {footerNavigation.length === 0 ? (
            <p className="opacity-60">[CLIENT CONTENT REQUIRED] — huquqiy havolalar</p>
          ) : (
            <ul className="flex flex-wrap gap-6">
              {footerNavigation.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="transition-opacity hover:opacity-60">
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
