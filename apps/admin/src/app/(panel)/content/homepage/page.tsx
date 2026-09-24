'use client';

import { type Localized } from '@barff/types';
import { Input } from '@barff/ui';
import { LocalizedField, emptyLocalized } from '@/components/fields/LocalizedField';
import { MediaPicker } from '@/components/fields/MediaPicker';
import { StatusField } from '@/components/fields/StatusField';
import { UpsertScreen } from '@/components/resource/UpsertScreen';
import { statusColumn } from '@/components/resource/ResourceScreen';

interface SectionRow {
  id: string;
  key: string;
  heading: Localized | null;
  status: string;
  displayOrder: number;
}

/**
 * Bosh sahifa bo'limlari (CLAUDE.md §4).
 *
 * Kalitlar kodda kutiladi: `hero`, `factory`, `cta`. Noma'lum kalit
 * saqlansa ham saytda ko'rinmaydi — shuning uchun izohda ro'yxat
 * berilgan.
 */
export default function HomepageSectionsPage() {
  return (
    <UpsertScreen<SectionRow>
      title="Bosh sahifa bo‘limlari"
      description="Sarlavha, matn, tugma va rasm. Kalitlar kodda kutiladi."
      endpoint="/admin/content/homepage-sections"
      queryKey="admin-homepage"
      keyField="key"
      keyLabel="bo‘lim"
      rowId={(row) => row.id}
      columns={[
        { key: 'key', header: 'Kalit', cell: (row) => row.key },
        { key: 'heading', header: 'Sarlavha', cell: (row) => row.heading?.uz ?? '—' },
        { key: 'displayOrder', header: 'Tartib', align: 'end', cell: (row) => row.displayOrder },
        statusColumn<SectionRow>(),
      ]}
      emptyValue={() => ({
        key: '',
        heading: emptyLocalized(),
        subheading: emptyLocalized(),
        ctaLabel: emptyLocalized(),
        ctaHref: '',
        status: 'DRAFT',
        displayOrder: 0,
        mediaAssetId: null,
      })}
      toForm={(row) => ({ ...row, mediaAssetId: null })}
      validate={(value) =>
        String(value['key'] ?? '').trim().length === 0 ? 'Kalit kiritilishi shart.' : null
      }
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Kalit"
            required
            hint="hero, stats, factory, products, process, quality, cta, news"
            value={String(value['key'] ?? '')}
            onChange={(event) => setValue({ ...value, key: event.target.value })}
          />

          <LocalizedField
            label="Sarlavha"
            value={(value['heading'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, heading: next })}
          />

          <LocalizedField
            label="Matn"
            value={(value['subheading'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, subheading: next })}
            multiline
          />

          <LocalizedField
            label="Tugma matni"
            value={(value['ctaLabel'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, ctaLabel: next })}
          />

          <Input
            label="Tugma havolasi"
            hint="/uz/become-partner yoki to‘liq manzil"
            value={String(value['ctaHref'] ?? '')}
            onChange={(event) => setValue({ ...value, ctaHref: event.target.value })}
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
