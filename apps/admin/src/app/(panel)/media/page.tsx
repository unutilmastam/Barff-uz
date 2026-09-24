'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, GlassCard } from '@barff/ui';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { type MediaAsset } from '@/components/fields/MediaPicker';
import { adminDelete, adminList, toRows } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api-client';

/**
 * Media kutubxona (CLAUDE.md §20).
 *
 * Yuklangan fayl SERVERDA tekshiriladi: turi imzo baytlari bo'yicha
 * aniqlanadi, kengaytmaga ishonilmaydi (S08). Bu yerdagi `accept` —
 * faqat fayl tanlash oynasi uchun qulaylik.
 */
export default function MediaPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['media', page],
    queryFn: () => adminList<MediaAsset>('/media', { page, limit: 20 }),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);

      return apiFetch<MediaAsset>('/media', { method: 'POST', body: form });
    },
    onSuccess: async () => {
      setError(null);
      await client.invalidateQueries({ queryKey: ['media'] });
    },
    onError: () => setError('Yuklab bo‘lmadi. Fayl turi yoki hajmini tekshiring.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete(`/media/${id}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['media'] });
    },
    // Fayl boshqa yozuvga bog'langan bo'lsa server rad etadi.
    onError: () =>
      setError('O‘chirib bo‘lmadi — fayl biror yozuvda ishlatilayotgan bo‘lishi mumkin.'),
  });

  const { rows, totalPages } = toRows(list.data);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media kutubxona</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Rasm va hujjatlar. Fayl turi serverda imzo baytlari bo‘yicha tekshiriladi.
        </p>
      </div>

      <GlassCard className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Yangi fayl yuklash</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) upload.mutate(file);
            }}
            className="text-sm text-[var(--color-fg-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand-500)] file:px-3 file:py-1.5 file:text-[var(--color-ink-900)]"
          />
        </label>

        {upload.isPending && <p role="status">Yuklanmoqda…</p>}
        {error !== null && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <DataTable
          caption="Media kutubxona"
          rows={rows}
          rowId={(row) => row.id}
          loading={list.isLoading}
          error={list.isError}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Kutubxona bo‘sh."
          columns={[
            { key: 'name', header: 'Fayl', cell: (row) => row.originalName },
            { key: 'mimeType', header: 'Turi', cell: (row) => row.mimeType },
            {
              key: 'size',
              header: "O'lcham",
              align: 'end',
              cell: (row) =>
                row.width !== null && row.height !== null ? `${row.width}×${row.height}` : '—',
            },
            {
              key: '__actions',
              header: 'Amallar',
              align: 'end',
              cell: (row) => (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(row.id)}>
                  O‘chirish
                </Button>
              ),
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
