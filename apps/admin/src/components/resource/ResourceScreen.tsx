'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Badge, Button, Dialog, GlassCard } from '@barff/ui';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ApiRequestError } from '@/lib/api-client';
import { adminCreate, adminDelete, adminList, adminUpdate, toRows } from '@/lib/admin-api';
import { cleanPayload } from '@/lib/clean-payload';

/**
 * CMS bo'limi uchun umumiy ekran (CLAUDE.md §8).
 *
 * NEGA umumiy: o'n uchta bo'lim deyarli bir xil ishlaydi — ro'yxat,
 * yaratish, tahrirlash, o'chirish. Har birini alohida yozish
 * ularning vaqt o'tib bir-biridan farq qilishiga olib kelardi:
 * biri xato holatini ko'rsatardi, boshqasi yo'q; biri o'chirishni
 * so'rardi, boshqasi darhol o'chirardi.
 *
 * Bo'limga XOS narsa faqat ikkitasi: jadval ustunlari va forma.
 * Ular parametr sifatida beriladi.
 */
export interface ResourceScreenProps<T> {
  title: string;
  description?: string;
  /** `/admin/content/news` kabi. */
  endpoint: string;
  /** Kesh kaliti — o'zgarishdan keyin ro'yxat yangilanishi uchun. */
  queryKey: string;

  columns: DataTableColumn<T>[];
  rowId: (row: T) => string;

  /** Yangi yozuv uchun boshlang'ich qiymat. */
  emptyValue: () => Record<string, unknown>;
  /** Mavjud yozuvni formaga aylantiradi. */
  toForm: (row: T) => Record<string, unknown>;
  /** Formani tekshiradi; xato bo'lsa matn qaytaradi. */
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

  /** `false` bo'lsa o'chirish tugmasi ko'rsatilmaydi. */
  deletable?: boolean;
  emptyMessage?: string;
}

export function ResourceScreen<T>({
  title,
  description,
  endpoint,
  queryKey,
  columns,
  rowId,
  emptyValue,
  toForm,
  validate,
  toPayload,
  renderForm,
  deletable = true,
  emptyMessage,
}: ResourceScreenProps<T>) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<{
    id: string | null;
    value: Record<string, unknown>;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const list = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => adminList<T>(endpoint, { page, limit: 20 }),
  });

  const refresh = () => client.invalidateQueries({ queryKey: [queryKey] });

  const save = useMutation({
    mutationFn: async (input: { id: string | null; value: Record<string, unknown> }) =>
      input.id === null
        ? adminCreate(endpoint, toPayload?.(input.value) ?? cleanPayload(input.value))
        : adminUpdate(
            `${endpoint}/${input.id}`,
            toPayload?.(input.value) ?? cleanPayload(input.value),
          ),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      setFormError(null);
    },
    onError: (error) => {
      // Server xabari ko'rsatiladi: u maydon darajasidagi sababni
      // biladi (masalan "slug band").
      setFormError(
        error instanceof ApiRequestError ? error.message : 'Saqlab bo‘lmadi. Qayta urinib ko‘ring.',
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete(`${endpoint}/${id}`),
    onSuccess: async () => {
      await refresh();
      setConfirmDelete(null);
    },
  });

  const { rows, totalPages } = toRows(list.data);

  const actionColumn: DataTableColumn<T> = {
    key: '__actions',
    header: 'Amallar',
    align: 'end',
    cell: (row) => (
      <span className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditing({ id: rowId(row), value: toForm(row) });
            setFormError(null);
          }}
        >
          Tahrirlash
        </Button>

        {deletable && (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(rowId(row))}>
            O‘chirish
          </Button>
        )}
      </span>
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description !== undefined && (
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{description}</p>
          )}
        </div>

        <Button
          onClick={() => {
            setEditing({ id: null, value: emptyValue() });
            setFormError(null);
          }}
        >
          Yangi qo‘shish
        </Button>
      </div>

      <GlassCard className="p-4">
        <DataTable
          caption={title}
          columns={[...columns, actionColumn]}
          rows={rows}
          rowId={rowId}
          loading={list.isLoading}
          error={list.isError}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          {...(emptyMessage !== undefined ? { emptyMessage } : {})}
        />
      </GlassCard>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        size="wide"
        title={editing?.id === null ? `${title} — yangi` : `${title} — tahrirlash`}
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

                const problem = validate?.(editing.value) ?? null;
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

            {renderForm(editing.value, (next) => setEditing({ ...editing, value: next }))}
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="O‘chirishni tasdiqlang"
        description="Yozuv ommaviy saytdan olib tashlanadi."
        closeLabel="Yopish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (confirmDelete !== null) remove.mutate(confirmDelete);
              }}
            >
              {remove.isPending ? 'O‘chirilmoqda' : 'O‘chirish'}
            </Button>
          </>
        }
      >
        {remove.isError && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            O‘chirib bo‘lmadi.
          </p>
        )}
      </Dialog>
    </div>
  );
}

/** Nashr holati uchun umumiy ustun. */
export function statusColumn<T extends { status?: string }>(): DataTableColumn<T> {
  return {
    key: 'status',
    header: 'Holat',
    cell: (row) => (
      <Badge tone={row.status === 'PUBLISHED' ? 'success' : 'neutral'}>
        {row.status === 'PUBLISHED' ? 'Nashr qilingan' : 'Qoralama'}
      </Badge>
    ),
  };
}
