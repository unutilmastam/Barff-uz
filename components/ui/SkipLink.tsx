'use client';

import { useLocale } from '@/components/providers/LocaleProvider';

/** Klaviatura foydalanuvchilari uchun navigatsiyani o'tkazib yuborish havolasi. */
export function SkipLink() {
  const { t } = useLocale();

  return (
    <a
      href="#main-content"
      className="bg-primary text-primary-foreground text-label sr-only rounded-full px-5 py-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300]"
    >
      {t.a11y.skipToContent}
    </a>
  );
}
