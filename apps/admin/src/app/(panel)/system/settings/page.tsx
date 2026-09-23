'use client';

import { Checkbox, Input, Textarea } from '@barff/ui';
import { UpsertScreen } from '@/components/resource/UpsertScreen';

interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isPublic: boolean;
}

/**
 * Tizim sozlamalari.
 *
 * Qiymat ixtiyoriy JSON, shuning uchun u MATN sifatida tahrirlanadi va
 * saqlashdan oldin tekshiriladi. Buzuq JSON saqlansa, uni o'qiydigan
 * sahifa yiqilardi.
 *
 * `isPublic` — eng muhim bayroq: u belgilangan sozlama
 * autentifikatsiyasiz API orqali ham ko'rinadi. Shuning uchun standart
 * holati YO'Q va u aniq tanlanishi kerak.
 */
export default function SettingsPage() {
  return (
    <UpsertScreen<SettingRow>
      title="Tizim sozlamalari"
      description="`Ommaviy` belgisi qo‘yilgan sozlama autentifikatsiyasiz ham ko‘rinadi."
      endpoint="/admin/content/settings"
      queryKey="admin-settings"
      keyField="key"
      keyLabel="sozlama"
      rowId={(row) => row.id}
      columns={[
        { key: 'key', header: 'Kalit', cell: (row) => row.key },
        {
          key: 'isPublic',
          header: 'Ommaviy',
          cell: (row) => (row.isPublic ? 'Ha' : "Yo'q"),
        },
        { key: 'description', header: 'Izoh', cell: (row) => row.description ?? '—' },
      ]}
      emptyValue={() => ({ key: '', value: '{}', description: '', isPublic: false })}
      toForm={(row) => ({ ...row, value: JSON.stringify(row.value ?? {}, null, 2) })}
      validate={(value) => {
        if (String(value['key'] ?? '').trim().length === 0) return 'Kalit kiritilishi shart.';

        try {
          JSON.parse(String(value['value'] ?? ''));
        } catch {
          return 'Qiymat to‘g‘ri JSON bo‘lishi kerak.';
        }

        return null;
      }}
      toPayload={(value) => ({
        key: value['key'],
        // Forma JSON'ni MATN sifatida tahrirlaydi — serverga obyekt
        // ketishi kerak. `validate` allaqachon tekshirgan.
        value: JSON.parse(String(value['value'] ?? '{}')),
        description: value['description'],
        isPublic: value['isPublic'],
      })}
      renderForm={(value, setValue) => (
        <>
          <Input
            label="Kalit"
            required
            hint="site.contact, notifications.lead"
            value={String(value['key'] ?? '')}
            onChange={(event) => setValue({ ...value, key: event.target.value })}
          />

          <Textarea
            label="Qiymat (JSON)"
            rows={8}
            value={String(value['value'] ?? '')}
            onChange={(event) => setValue({ ...value, value: event.target.value })}
          />

          <Input
            label="Izoh"
            value={String(value['description'] ?? '')}
            onChange={(event) => setValue({ ...value, description: event.target.value })}
          />

          <Checkbox
            label="Ommaviy — autentifikatsiyasiz ham ko‘rinadi"
            checked={value['isPublic'] === true}
            onCheckedChange={(checked) => setValue({ ...value, isPublic: checked === true })}
          />
        </>
      )}
    />
  );
}
