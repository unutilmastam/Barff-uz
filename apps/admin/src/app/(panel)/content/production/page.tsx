'use client';

import { type Localized } from '@barff/types';
import { Input } from '@barff/ui';
import {
  LocalizedField,
  emptyLocalized,
  hasAnyTranslation,
} from '@/components/fields/LocalizedField';
import { MediaPicker } from '@/components/fields/MediaPicker';
import { StatusField } from '@/components/fields/StatusField';
import { UpsertScreen } from '@/components/resource/UpsertScreen';
import { statusColumn } from '@/components/resource/ResourceScreen';

interface StepRow {
  id: string;
  slug: string;
  title: Localized;
  status: string;
  displayOrder: number;
}

/**
 * Ishlab chiqarish bosqichlari (CLAUDE.md §4).
 *
 * Ketma-ketlik SPEC'DA qat'iy belgilangan, shuning uchun yangi bosqich
 * qo'shish odatda kerak emas — mavjudlarining matni tahrirlanadi.
 */
export default function ProductionStepsPage() {
  return (
    <UpsertScreen<StepRow>
      title="Ishlab chiqarish bosqichlari"
      description="Ketma-ketlik spec'da belgilangan; bu yerda matn va rasm tahrirlanadi."
      endpoint="/admin/content/production-steps"
      queryKey="admin-steps"
      keyField="slug"
      keyLabel="bosqich"
      rowId={(row) => row.id}
      columns={[
        { key: 'displayOrder', header: '#', align: 'end', cell: (row) => row.displayOrder },
        { key: 'title', header: 'Nomi', cell: (row) => row.title?.uz ?? row.slug },
        { key: 'slug', header: 'Slug', cell: (row) => row.slug },
        statusColumn<StepRow>(),
      ]}
      emptyValue={() => ({
        slug: '',
        title: emptyLocalized(),
        description: emptyLocalized(),
        status: 'DRAFT',
        displayOrder: 0,
        mediaAssetId: null,
      })}
      toForm={(row) => ({ ...row, mediaAssetId: null })}
      validate={(value) => {
        if (String(value['slug'] ?? '').trim().length === 0) return 'Slug kiritilishi shart.';
        if (!hasAnyTranslation(value['title'] as Localized)) return 'Nomi kiritilishi shart.';
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Slug"
            required
            hint="xomashyo, qabul-qilish, saralash, ..."
            value={String(value['slug'] ?? '')}
            onChange={(event) => setValue({ ...value, slug: event.target.value })}
          />

          <LocalizedField
            label="Nomi"
            required
            value={(value['title'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, title: next })}
          />

          <LocalizedField
            label="Tavsif"
            value={(value['description'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, description: next })}
            multiline
          />

          <MediaPicker
            label="Rasm"
            value={(value['mediaAssetId'] as string | null) ?? null}
            onChange={(id) => setValue({ ...value, mediaAssetId: id })}
          />

          <Input
            label="Tartib raqami"
            type="number"
            min={0}
            value={String(value['displayOrder'] ?? 0)}
            onChange={(event) =>
              setValue({ ...value, displayOrder: Number(event.target.value) || 0 })
            }
          />

          <StatusField
            value={String(value['status'] ?? 'DRAFT')}
            onChange={(next) => setValue({ ...value, status: next })}
          />
        </>
      )}
    />
  );
}
