import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

/**
 * Til tanlovi uchun kichik tashqi store.
 *
 * React holati sifatida emas, `useSyncExternalStore` uchun store sifatida yozilgan:
 * server har doim `DEFAULT_LOCALE` beradi, brauzer esa saqlangan tanlovni —
 * shu sababli hydration xatosi ham, effekt ichida `setState` ham bo'lmaydi.
 */
let cached: Locale | null = null;
const listeners = new Set<() => void>();

function readStored(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    // localStorage o'chirilgan bo'lishi mumkin.
    return DEFAULT_LOCALE;
  }
}

export const localeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): Locale {
    cached ??= readStored();
    return cached;
  },

  getServerSnapshot(): Locale {
    return DEFAULT_LOCALE;
  },

  set(next: Locale) {
    if (cached === next) return;
    cached = next;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Saqlab bo'lmasa ham joriy sessiyada til almashadi.
    }
    listeners.forEach((listener) => listener());
  },
};
