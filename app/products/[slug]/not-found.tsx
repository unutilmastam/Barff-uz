'use client';

import { NotFoundState } from '@/components/ui/NotFoundState';
import { useLocale } from '@/components/providers/LocaleProvider';

export default function ProductNotFound() {
  const { t } = useLocale();
  return (
    <NotFoundState title={t.product.notFound} href="/products" label={t.product.backToProducts} />
  );
}
