'use client';

import { type Localized } from '@barff/types';
import { Checkbox, Input } from '@barff/ui';
import {
  LocalizedField,
  emptyLocalized,
  hasAnyTranslation,
} from '@/components/fields/LocalizedField';
import { ResourceScreen } from '@/components/resource/ResourceScreen';
import { cleanPayload } from '@/lib/clean-payload';
import { suggestSlug } from '@/lib/product-form';

interface CategoryRow {
  id: string;
  slug: string;
  name: Localized;
  isActive: boolean;
  displayOrder: number;
  productCount: number;
}

/**
 * Mahsulot kategoriyalari.
 *
 * Mahsuloti bor kategoriyani o'chirib bo'lmaydi — server 409 qaytaradi
 * (avval mahsulotlarni boshqa kategoriyaga ko'chirish kerak).
 */
export default function CategoriesPage() {
  return (
    <ResourceScreen<CategoryRow>
      title="Kategoriyalar"
      description="Mahsulotlar guruhi: masalan «Sharbatlar», «Ichimliklar»."
      endpoint="/admin/categories"
      queryKey="admin-categories"
      rowId={(row) => row.id}
      columns={[
        { key: 'name', header: 'Nomi', cell: (row) => row.name?.uz ?? row.slug },
        { key: 'slug', header: 'Slug', cell: (row) => row.slug },
        {
          key: 'productCount',
          header: 'Mahsulotlar',
          align: 'end',
          cell: (row) => row.productCount,
        },
        {
          key: 'isActive',
          header: 'Holat',
          cell: (row) => (row.isActive ? 'Faol' : 'Yashirin'),
        },
      ]}
      emptyValue={() => ({
        slug: '',
        name: emptyLocalized(),
        displayOrder: 0,
        isActive: true,
      })}
      // Mavjud kategoriyada slug nom o'zgarganda O'ZGARMAYDI (manzillar buzilmasin).
      toForm={(row) => ({
        slugTouched: true,
        slug: row.slug,
        name: row.name,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })}
      toPayload={({ slugTouched: _touched, ...rest }) => cleanPayload(rest)}
      validate={(value) => {
        if (!hasAnyTranslation(value['name'] as Localized)) return 'Nomi kiritilishi shart.';
        if (String(value['slug'] ?? '').trim().length < 2) return 'Slug kiritilishi shart.';
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
          <LocalizedField
            label="Nomi"
            required
            value={(value['name'] as Localized) ?? emptyLocalized()}
            onChange={(name) =>
              setValue({
                ...value,
                name,
                // Yangi kategoriyada slug nomdan to'ladi, qo'lda yozilsa tegilmaydi.
                ...(value['slugTouched'] === true ? {} : { slug: suggestSlug(name) }),
              })
            }
          />

          <Input
            label="Slug"
            required
            hint="Saytda ko‘rinadi: ?category=<slug>"
            value={String(value['slug'] ?? '')}
            onChange={(event) =>
              setValue({ ...value, slug: event.target.value, slugTouched: true })
            }
          />

          <Input
            label="Tartib raqami"
            type="number"
            min={0}
            value={String(value['displayOrder'] ?? 0)}
            onChange={(event) => setValue({ ...value, displayOrder: Number(event.target.value) })}
          />

          <Checkbox
            label="Saytda ko‘rinsin"
            checked={value['isActive'] === true}
            onCheckedChange={(checked) => setValue({ ...value, isActive: checked === true })}
          />
        </>
      )}
    />
  );
}
