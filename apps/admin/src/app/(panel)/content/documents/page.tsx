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
import { ResourceScreen, statusColumn } from '@/components/resource/ResourceScreen';

interface DocumentRow {
  id: string;
  title: Localized;
  status: string;
  displayOrder: number;
}

export default function DocumentsPage() {
  return (
    <ResourceScreen<DocumentRow>
      title="Hujjatlar"
      description="Katalog va boshqa ommaviy hujjatlar."
      endpoint="/admin/content/documents"
      queryKey="admin-documents"
      rowId={(row) => row.id}
      columns={[
        { key: 'title', header: 'Nomi', cell: (row) => row.title?.uz ?? '—' },
        { key: 'displayOrder', header: 'Tartib', align: 'end', cell: (row) => row.displayOrder },
        statusColumn<DocumentRow>(),
      ]}
      emptyValue={() => ({
        title: emptyLocalized(),
        description: emptyLocalized(),
        status: 'DRAFT',
        mediaAssetId: null,
        displayOrder: 0,
      })}
      toForm={(row) => ({ ...row, mediaAssetId: null })}
      validate={(value) => {
        if (!hasAnyTranslation(value['title'] as Localized)) return 'Nomi kiritilishi shart.';
        if (value['mediaAssetId'] == null) return 'Fayl tanlanishi shart.';
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
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
            label="Fayl"
            accept="application/pdf,image/*"
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
