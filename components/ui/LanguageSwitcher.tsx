'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  /** `compact` — Header uchun bir qator; `stacked` — MobileMenu/Footer uchun kattaroq. */
  size?: 'compact' | 'stacked';
}

/**
 * UZ / RU / EN almashtirgichi.
 * Ro'yxat `lib/i18n.ts` dagi `LOCALES` dan quriladi — til qo'shilsa bu fayl o'zgarmaydi.
 */
export function LanguageSwitcher({ className, size = 'compact' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t.a11y.selectLanguage}
      className={cn('flex items-center', size === 'compact' ? 'gap-1' : 'gap-3', className)}
    >
      {LOCALES.map((code) => {
        const isActive = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => setLocale(code)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'rounded-full font-medium tracking-[0.08em] transition-colors duration-[--duration-micro]',
              size === 'compact' ? 'px-2 py-1 text-[0.75rem]' : 'px-3 py-1.5 text-[0.9375rem]',
              isActive ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
