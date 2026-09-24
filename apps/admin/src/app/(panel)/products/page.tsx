'use client';

import { type Localized } from '@barff/types';
import { Checkbox, Input } from '@barff/ui';
import {
  LocalizedField,
  emptyLocalized,
  hasAnyTranslation,
} from '@/components/fields/LocalizedField';
import { ResourceScreen } from '@/components/resource/ResourceScreen';

interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  name: Localized;
  isActive: boolean;
}

/**
 * Mahsulotlar (CLAUDE.md §4).
 *
 * DIQQAT: mahsulot ma'lumotlari — tarkib, hajm, saqlash sharoiti —
 * BARFF dan keladi va o'ylab topilmaydi. Seed'dagi yozuvlar `[MOCK]`
 * bilan belgilangan.
 *
 * Variantlar va narxlar alohida endpoint'larda; ular S23 (dilerlik
 * narxlari) bilan birga to'liq ekranga chiqadi.
 */
export default function ProductsPage() {
  return (
    <ResourceScreen<ProductRow>
      title="Mahsulotlar"
      description="Tarkib va o‘lchamlar BARFF dan keladi — o‘ylab topilmaydi."
      endpoint="/admin/products"
      queryKey="admin-products"
      rowId={(row) => row.id}
      columns={[
        { key: 'name', header: 'Nomi', cell: (row) => row.name?.uz ?? row.slug },
        { key: 'sku', header: 'Artikul', cell: (row) => row.sku },
        { key: 'slug', header: 'Slug', cell: (row) => row.slug },
        {
          key: 'isActive',
          header: 'Holat',
          cell: (row) => (row.isActive ? 'Faol' : 'Yashirilgan'),
        },
      ]}
      emptyValue={() => ({
        slug: '',
        sku: '',
        name: emptyLocalized(),
        description: emptyLocalized(),
        ingredients: emptyLocalized(),
        storage: emptyLocalized(),
        flavor: emptyLocalized(),
        shelfLifeDays: null,
        isActive: false,
        displayOrder: 0,
      })}
      toForm={(row) => ({ ...row })}
      validate={(value) => {
        if (String(value['slug'] ?? '').trim().length === 0) return 'Slug kiritilishi shart.';
        if (String(value['sku'] ?? '').trim().length === 0) return 'Artikul kiritilishi shart.';
        if (!hasAnyTranslation(value['name'] as Localized)) return 'Nomi kiritilishi shart.';
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Slug"
            required
            hint="Manzilda ko‘rinadi: /products/<slug>"
            value={String(value['slug'] ?? '')}
            onChange={(event) => setValue({ ...value, slug: event.target.value })}
          />

          <Input
            label="Artikul (SKU)"
            required
            value={String(value['sku'] ?? '')}
            onChange={(event) => setValue({ ...value, sku: event.target.value })}
          />

          <LocalizedField
            label="Nomi"
            required
            value={(value['name'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, name: next })}
          />

          <LocalizedField
            label="Tavsif"
            value={(value['description'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, description: next })}
            multiline
          />

          <LocalizedField
            label="Tarkibi"
            value={(value['ingredients'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, ingredients: next })}
            multiline
          />

          <LocalizedField
            label="Saqlash sharoiti"
            value={(value['storage'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, storage: next })}
          />

          <LocalizedField
            label="Ta'mi"
            value={(value['flavor'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, flavor: next })}
          />

          <Input
            label="Yaroqlilik muddati (kun)"
            type="number"
            min={0}
            value={value['shelfLifeDays'] === null ? '' : String(value['shelfLifeDays'] ?? '')}
            onChange={(event) =>
              setValue({
                ...value,
                shelfLifeDays: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />

          <Checkbox
            label="Saytda ko‘rinsin"
            hint="Ma'lumotlar tasdiqlanmaguncha belgilanmaydi."
            checked={value['isActive'] === true}
            onCheckedChange={(checked) => setValue({ ...value, isActive: checked === true })}
          />
        </>
      )}
    />
  );
}
