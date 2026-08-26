'use client';

import { PageHeading } from '@/components/ui/PageHeading';
import { useLocale } from '@/components/providers/LocaleProvider';
import type { Dictionary } from '@/lib/i18n';

/** Sahifa nomini tarjimadan olib `<h1>` sifatida beradi. */
export function PageTitle({ section }: { section: keyof Dictionary['sections'] }) {
  const { t } = useLocale();
  return <PageHeading>{t.sections[section]}</PageHeading>;
}
