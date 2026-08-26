'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { LOCALE_HTML_LANG, getDictionary, type Dictionary } from '@/lib/i18n';
import { localeStore } from '@/lib/locale-store';
import type { Locale } from '@/lib/types';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Joriy tildagi lug'at: `t.nav.products`. Kalit xato bo'lsa kompilyator xato beradi. */
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Til holati butun sayt uchun bitta joyda.
 *
 * Har til uchun alohida komponent nusxasi YO'Q — komponentlar `useLocale()` orqali
 * bir xil lug'at tuzilmasini oladi.
 *
 * Til bo'yicha alohida marshrut (`/ru/...`) kerak bo'lsa Phase 10 (SEO) da qo'shiladi;
 * komponentlar o'zgarmaydi, chunki hammasi shu context orqali ishlaydi.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    localeStore.subscribe,
    localeStore.getSnapshot,
    localeStore.getServerSnapshot,
  );

  const setLocale = useCallback((next: Locale) => localeStore.set(next), []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: getDictionary(locale) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale() faqat <LocaleProvider> ichida ishlatiladi.');
  return context;
}
