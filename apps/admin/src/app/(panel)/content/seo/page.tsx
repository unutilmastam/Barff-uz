'use client';

import { type Localized } from '@barff/types';
import { Checkbox, Input } from '@barff/ui';
import { LocalizedField, emptyLocalized } from '@/components/fields/LocalizedField';
import { MediaPicker } from '@/components/fields/MediaPicker';
import { UpsertScreen } from '@/components/resource/UpsertScreen';

interface SeoRow {
  id: string;
  path: string;
  title: Localized | null;
  noIndex: boolean;
}

/**
 * Sahifalar SEO ma'lumoti (CLAUDE.md §19).
 *
 * Bu yerdagi yozuv sahifaning O'Z matnidan USTUN turadi — ya'ni
 * sarlavhani kodga tegmasdan o'zgartirish mumkin (S15 da qurilgan).
 */
export default function SeoPage() {
  return (
    <UpsertScreen<SeoRow>
      title="Sahifalar va SEO"
      description="Bu yerdagi sarlavha va tavsif sahifaning o‘z matnidan ustun turadi."
      endpoint="/admin/content/seo"
      queryKey="admin-seo"
      keyField="path"
      keyLabel="sahifa"
      rowId={(row) => row.id}
      columns={[
        { key: 'path', header: "Yo'l", cell: (row) => row.path },
        { key: 'title', header: 'Sarlavha', cell: (row) => row.title?.uz ?? '—' },
        {
          key: 'noIndex',
          header: 'Indekslash',
          cell: (row) => (row.noIndex ? 'Taqiqlangan' : 'Ruxsat'),
        },
      ]}
      emptyValue={() => ({
        path: '/',
        title: emptyLocalized(),
        description: emptyLocalized(),
        noIndex: false,
        ogImageId: null,
      })}
      toForm={(row) => ({ ...row, ogImageId: null })}
      validate={(value) => {
        const path = String(value['path'] ?? '');
        // Server ham shu qoidani tekshiradi — bu faqat tezroq javob.
        if (!path.startsWith('/')) return "Yo'l `/` bilan boshlanishi kerak.";
        return null;
      }}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Sahifa yo'li"
            required
            hint="Til segmentisiz: /products, /news/anor-sharbati"
            value={String(value['path'] ?? '')}
            onChange={(event) => setValue({ ...value, path: event.target.value })}
          />

          <LocalizedField
            label="Sarlavha"
            hint="70 belgigacha — qidiruv natijasida shu ko‘rinadi."
            value={(value['title'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, title: next })}
          />

          <LocalizedField
            label="Tavsif"
            hint="160 belgigacha."
            value={(value['description'] as Localized) ?? emptyLocalized()}
            onChange={(next) => setValue({ ...value, description: next })}
            multiline
          />

          <MediaPicker
            label="Ijtimoiy tarmoq rasmi"
            value={(value['ogImageId'] as string | null) ?? null}
            onChange={(id) => setValue({ ...value, ogImageId: id })}
          />

          <Checkbox
            label="Bu sahifa qidiruvga tushmasin"
            hint="Matni tayyor bo‘lmagan sahifa uchun."
            checked={value['noIndex'] === true}
            onCheckedChange={(checked) => setValue({ ...value, noIndex: checked === true })}
          />
        </>
      )}
    />
  );
}
