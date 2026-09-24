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

interface NewsRow {
  id: string;
  slug: string;
  title: Localized;
  status: string;
  publishedAt: string | null;
}

export default function NewsPage() {
  return (
    <ResourceScreen<NewsRow>
      title="Yangiliklar"
      description="Ommaviy saytdagi yangiliklar bo‘limi shu yerdan boshqariladi."
      endpoint="/admin/content/news"
      queryKey="admin-news"
      rowId={(row) => row.id}
      columns={[
        { key: 'title', header: 'Sarlavha', cell: (row) => row.title?.uz ?? row.slug },
        { key: 'slug', header: 'Slug', cell: (row) => row.slug },
        statusColumn<NewsRow>(),
        {
          key: 'publishedAt',
          header: 'Nashr sanasi',
          cell: (row) =>
            row.publishedAt === null ? '—' : new Date(row.publishedAt).toLocaleDateString('uz-UZ'),
        },
      ]}
      emptyValue={() => ({
        slug: '',
        title: emptyLocalized(),
        excerpt: emptyLocalized(),
        body: emptyLocalized(),
        // Yangi maqola HAR DOIM qoralama: nashr alohida qaror.
        status: 'DRAFT',
        coverImageId: null,
      })}
      toForm={(row) => ({ ...row, coverImageId: null })}
      validate={(value) => {
        if (String(value['slug'] ?? '').trim().length === 0) return 'Slug kiritilishi shart.';
        if (!hasAnyTranslation(value['title'] as Localized)) return 'Sarlavha kiritilishi shart.';
        if (!hasAnyTranslation(value['body'] as Localized)) return 'Matn kiritilishi shart.';
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Slug"
            required
            hint="Manzilda ko‘rinadi: /news/<slug>"
            value={String(value['slug'] ?? '')}
            onChange={(event) => setValue({ ...value, slug: event.target.value })}
          />

          <LocalizedField
            label="Sarlavha"
            required
            value={(value['title'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, title: next })}
          />

          <LocalizedField
            label="Qisqa mazmun"
            hint="Ro‘yxatda ko‘rinadi."
            value={(value['excerpt'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, excerpt: next })}
            multiline
          />

          <LocalizedField
            label="Matn"
            required
            value={(value['body'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, body: next })}
            multiline
          />

          <MediaPicker
            label="Muqova rasmi"
            value={(value['coverImageId'] as string | null) ?? null}
            onChange={(id) => setValue({ ...value, coverImageId: id })}
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
