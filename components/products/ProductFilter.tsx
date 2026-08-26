'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { categories } from '@/data/categories';
import { cn } from '@/lib/utils';

interface ProductFilterProps {
  /** Tanlangan kategoriya `id` si; `null` — hammasi. */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** Har kategoriyadagi mahsulotlar soni — bo'sh kategoriya ko'rsatilmaydi. */
  counts: Record<string, number>;
  total: number;
}

/**
 * Kategoriya bo'yicha filtr.
 *
 * Tugmalar `role="tab"` emas, oddiy tugma: ular kontentni almashtirmaydi, balki
 * ro'yxatni toraytiradi. `aria-pressed` bosilgan holatni bildiradi.
 * Bo'sh kategoriyalar umuman ko'rsatilmaydi — bosib bo'sh natija olish yomon UX.
 */
export function ProductFilter({ value, onChange, counts, total }: ProductFilterProps) {
  const { locale, t } = useLocale();
  const visible = categories.filter((category) => (counts[category.id] ?? 0) > 0);

  if (visible.length < 2) return null;

  const button = (active: boolean) =>
    cn(
      'text-label rounded-full border px-5 py-2.5 transition-colors duration-[--duration-micro]',
      active
        ? 'border-foreground bg-primary text-primary-foreground'
        : 'border-line text-muted hover:border-foreground hover:text-foreground',
    );

  return (
    <div role="group" aria-label={t.filter.label} className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={button(value === null)}
      >
        {t.filter.all}
        <span className="ml-2 tabular-nums opacity-60">{total}</span>
      </button>

      {visible.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          aria-pressed={value === category.id}
          className={button(value === category.id)}
        >
          {category.title[locale]}
          <span className="ml-2 tabular-nums opacity-60">{counts[category.id]}</span>
        </button>
      ))}
    </div>
  );
}
