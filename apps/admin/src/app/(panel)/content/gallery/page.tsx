'use client';

import { type Localized } from '@barff/types';
import { Input } from '@barff/ui';
import { LocalizedField, emptyLocalized } from '@/components/fields/LocalizedField';
import { MediaPicker } from '@/components/fields/MediaPicker';
import { StatusField } from '@/components/fields/StatusField';
import { ResourceScreen, statusColumn } from '@/components/resource/ResourceScreen';

interface GalleryRow {
  id: string;
  caption: Localized | null;
  album: string | null;
  status: string;
  displayOrder: number;
}

export default function GalleryPage() {
  return (
    <ResourceScreen<GalleryRow>
      title="Galereya"
      description="Zavod va mahsulot rasmlari."
      endpoint="/admin/content/gallery"
      queryKey="admin-gallery"
      rowId={(row) => row.id}
      columns={[
        { key: 'caption', header: 'Izoh', cell: (row) => row.caption?.uz ?? '—' },
        { key: 'album', header: 'Albom', cell: (row) => row.album ?? '—' },
        { key: 'displayOrder', header: 'Tartib', align: 'end', cell: (row) => row.displayOrder },
        statusColumn<GalleryRow>(),
      ]}
      emptyValue={() => ({
        caption: emptyLocalized(),
        album: '',
        status: 'DRAFT',
        mediaAssetId: null,
        displayOrder: 0,
      })}
      toForm={(row) => ({ ...row, mediaAssetId: null })}
      validate={(value) =>
        value['mediaAssetId'] === null || value['mediaAssetId'] === undefined
          ? 'Rasm tanlanishi shart.'
          : null
      }
      renderForm={(value, setValue) => (
        <>
          <MediaPicker
            label="Rasm"
            value={(value['mediaAssetId'] as string | null) ?? null}
            onChange={(id) => setValue({ ...value, mediaAssetId: id })}
          />

          <LocalizedField
            label="Izoh"
            value={(value['caption'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, caption: next })}
          />

          <Input
            label="Albom"
            hint="Guruhlash uchun: factory, products, events"
            value={String(value['album'] ?? '')}
            onChange={(event) => setValue({ ...value, album: event.target.value })}
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
