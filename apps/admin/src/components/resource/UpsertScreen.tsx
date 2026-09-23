'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Button, Dialog, GlassCard } from '@barff/ui';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ApiRequestError } from '@/lib/api-client';
import { adminList, adminPut, toRows } from '@/lib/admin-api';
import { cleanPayload } from '@/lib/clean-payload';

/**
 * `PUT` bilan saqlanadigan bo'limlar uchun ekran.
 *
 * Ishlab chiqarish bosqichlari, bosh sahifa bo'limlari, SEO va
 * sozlamalar — ularning RO'YXATI qat'iy: yangi bosqich o'ylab
 * topilmaydi, mavjudlari tahrirlanadi. Shuning uchun bu yerda
 * "o'chirish" yo'q va yangi yozuv kalit (`slug`/`key`/`path`) bilan
 * yaratiladi.
 */
export function UpsertScreen<T>({
  title,
  description,
  endpoint,
  queryKey,
  keyField,
  keyLabel,
  columns,
  rowId,
  emptyValue,
  toForm,
  validate,
  toPayload,
  renderForm,
  allowCreate = true,
}: {
  title: string;
  description?: string;
  endpoint: string;
  queryKey: string;
  /** `slug`, `key` yoki `path` — manzilga qo'shiladigan maydon. */
  keyField: string;
  keyLabel: string;
  columns: DataTableColumn<T>[];
  rowId: (row: T) => string;
  emptyValue: () => Record<string, unknown>;
  toForm: (row: T) => Record<string, unknown>;
  validate?: (value: Record<string, unknown>) => string | null;
  /**
   * Formani API kutgan shaklga o'tkazadi.
   *
   * Kerak bo'ladigan holat: forma qiymati foydalanuvchi uchun qulay
   * ko'rinishda (masalan JSON matn sifatida), server esa boshqa
   * turni kutadi. Berilmasa, forma qiymati o'zgarishsiz yuboriladi.
   */
  toPayload?: (value: Record<string, unknown>) => unknown;
  renderForm: (
    value: Record<string, unknown>,
    setValue: (next: Record<string, unknown>) => void,
  ) => ReactNode;
  allowCreate?: boolean;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: [queryKey],
    queryFn: () => adminList<T>(endpoint, { limit: 100 }),
  });

  const save = useMutation({
    mutationFn: (value: Record<string, unknown>) => {
      const key = String(value[keyField] ?? '');

      /*
        SEO va sozlamalar kalitni TANADA yuboradi, bosqich va bo'lim
        esa MANZILDA. Farqni shu yerda hal qilamiz: manzilga kalit
        qo'shiladigan bo'limlar `keyField` ni `path` ga chiqaradi.
      */
      const useKeyInPath = keyField === 'slug' || keyField === 'key';

      return adminPut(
        useKeyInPath ? `${endpoint}/${encodeURIComponent(key)}` : endpoint,
        toPayload?.(value) ?? cleanPayload(value),
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [queryKey] });
      setEditing(null);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiRequestError ? error.message : 'Saqlab bo‘lmadi. Qayta urinib ko‘ring.',
      );
    },
  });

  const { rows } = toRows(list.data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description !== undefined && (
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{description}</p>
          )}
        </div>

        {allowCreate && (
          <Button
            onClick={() => {
              setEditing(emptyValue());
              setFormError(null);
            }}
          >
            Yangi qo‘shish
          </Button>
        )}
      </div>

      <GlassCard className="p-4">
        <DataTable
          caption={title}
          columns={[
            ...columns,
            {
              key: '__actions',
              header: 'Amallar',
              align: 'end',
              cell: (row) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(toForm(row));
                    setFormError(null);
                  }}
                >
                  Tahrirlash
                </Button>
              ),
            },
          ]}
          rows={rows}
          rowId={rowId}
          loading={list.isLoading}
          error={list.isError}
        />
      </GlassCard>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        size="wide"
        title={`${title} — ${keyLabel}`}
        closeLabel="Yopish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (editing === null) return;

                const problem = validate?.(editing) ?? null;
                if (problem !== null) {
                  setFormError(problem);
                  return;
                }

                save.mutate(editing);
              }}
            >
              {save.isPending ? 'Saqlanmoqda' : 'Saqlash'}
            </Button>
          </>
        }
      >
        {editing !== null && (
          <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
            {formError !== null && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                {formError}
              </p>
            )}

            {renderForm(editing, setEditing)}
          </div>
        )}
      </Dialog>
    </div>
  );
}
