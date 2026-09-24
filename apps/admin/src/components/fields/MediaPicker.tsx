'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, MediaFrame } from '@barff/ui';
import { useState } from 'react';
import { adminList, toRows } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api-client';

/**
 * Media kutubxonasidan fayl tanlash (CLAUDE.md §20).
 *
 * Yuklash SHU YERDA ham mumkin: muharrir rasmni tanlash uchun boshqa
 * bo'limga o'tib, keyin qaytib kelishi kerak emas.
 *
 * Fayl SERVERGA yuboriladi va u yerda turi imzo baytlari bo'yicha
 * tekshiriladi (S08). Mijozdagi `accept` — faqat qulaylik: u
 * foydalanuvchiga to'g'ri fayl tanlashga yordam beradi, himoya emas.
 */
export interface MediaAsset {
  id: string;
  originalName: string;
  mimeType: string;
  kind: string;
  width: number | null;
  height: number | null;
  variants?: { label: string; key: string; width: number; format: string }[] | null;
}

export function MediaPicker({
  label,
  value,
  onChange,
  accept = 'image/*',
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  accept?: string;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['media'],
    queryFn: () => adminList<MediaAsset>('/media', { limit: 50 }),
    // Oyna ochilmaguncha ro'yxat kerak emas.
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);

      // `FormData` uchun `Content-Type` QO'YILMAYDI: brauzer uni
      // `boundary` bilan birga o'zi qo'yadi.
      return apiFetch<MediaAsset>('/media', { method: 'POST', body: form });
    },
    onSuccess: (asset) => {
      void client.invalidateQueries({ queryKey: ['media'] });
      onChange(asset.id);
      setOpen(false);
    },
  });

  const { rows } = toRows(data);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {value === null ? 'Fayl tanlash' : 'Almashtirish'}
        </Button>

        {value !== null && (
          <>
            <span className="text-xs text-[var(--color-fg-subtle)]">Tanlandi</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Olib tashlash
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="wide"
        title="Media kutubxona"
        closeLabel="Yopish"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Yangi fayl yuklash</span>
            <input
              type="file"
              accept={accept}
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file !== undefined) upload.mutate(file);
              }}
              className="text-sm text-[var(--color-fg-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand-500)] file:px-3 file:py-1.5 file:text-[var(--color-ink-900)]"
            />
          </label>

          {upload.isPending && <p role="status">Yuklanmoqda…</p>}
          {upload.isError && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              Yuklab bo‘lmadi. Fayl turi yoki hajmini tekshiring.
            </p>
          )}

          <div className="max-h-[50vh] overflow-y-auto">
            {isLoading && <p role="status">Yuklanmoqda…</p>}
            {isError && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                Kutubxona ochilmadi.
              </p>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <p className="text-sm text-[var(--color-fg-muted)]">Kutubxona bo‘sh.</p>
            )}

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {rows.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(asset.id);
                      setOpen(false);
                    }}
                    className="w-full text-left"
                  >
                    <MediaFrame ratio="square">
                      <span className="flex h-full items-center justify-center p-2 text-center text-[10px] break-all text-[var(--color-fg-subtle)]">
                        {asset.originalName}
                      </span>
                    </MediaFrame>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
