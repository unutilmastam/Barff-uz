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

interface CertificateRow {
  id: string;
  title: Localized;
  issuer: string | null;
  number: string | null;
  status: string;
}

/**
 * Sertifikatlar.
 *
 * CLAUDE.md §19: sertifikat O'YLAB TOPILMAYDI. Shuning uchun yangi
 * yozuv qoralama bo'lib yaratiladi va nashr qilishdan oldin haqiqiy
 * hujjat biriktirilishi kerak.
 */
export default function CertificatesPage() {
  return (
    <ResourceScreen<CertificateRow>
      title="Sertifikatlar"
      description="Faqat HAQIQIY hujjatlar kiritiladi — sertifikat o‘ylab topilmaydi."
      endpoint="/admin/content/certificates"
      queryKey="admin-certificates"
      rowId={(row) => row.id}
      columns={[
        { key: 'title', header: 'Nomi', cell: (row) => row.title?.uz ?? '—' },
        { key: 'issuer', header: 'Bergan tashkilot', cell: (row) => row.issuer ?? '—' },
        { key: 'number', header: 'Raqami', cell: (row) => row.number ?? '—' },
        statusColumn<CertificateRow>(),
      ]}
      emptyValue={() => ({
        title: emptyLocalized(),
        description: emptyLocalized(),
        issuer: '',
        number: '',
        status: 'DRAFT',
        mediaAssetId: null,
        displayOrder: 0,
      })}
      toForm={(row) => ({ ...row, mediaAssetId: null })}
      validate={(value) =>
        hasAnyTranslation(value['title'] as Localized) ? null : 'Nomi kiritilishi shart.'
      }
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

          <Input
            label="Bergan tashkilot"
            value={String(value['issuer'] ?? '')}
            onChange={(event) => setValue({ ...value, issuer: event.target.value })}
          />

          <Input
            label="Sertifikat raqami"
            value={String(value['number'] ?? '')}
            onChange={(event) => setValue({ ...value, number: event.target.value })}
          />

          <MediaPicker
            label="Hujjat fayli (PDF yoki rasm)"
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
