'use client';

import { type ReactNode, useId, useState } from 'react';
import { Button, Checkbox, Pagination } from '@barff/ui';

/**
 * Admin jadvali (CLAUDE.md §8).
 *
 * BIR JOYDA: sahifalash, saralash, tanlash va to'rt holat (ma'lumot
 * bor, yuklanmoqda, bo'sh, xato). Har bir ekran buni o'zi yozsa,
 * ular vaqt o'tib bir-biridan farq qilib ketardi va kimdir xato
 * holatini unutardi.
 *
 * Ma'lumot SERVERDAN sahifalab keladi: mijozda filtrlash 10 000
 * qatorli jadvalda brauzerni to'xtatib qo'yardi. Shuning uchun
 * `onSort` va `onPageChange` tashqariga chiqariladi.
 */
export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Qator uchun katakcha mazmuni. */
  cell: (row: T) => ReactNode;
  /** Server shu ustun bo'yicha saralay oladimi. */
  sortable?: boolean;
  /** Raqamlar o'ngga tekislanadi — ustunda taqqoslash osonlashadi. */
  align?: 'start' | 'end';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowId: (row: T) => string;

  /** `null` — ma'lumot kelmadi (xato holati). */
  error?: boolean;
  loading?: boolean;

  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  onSort?: (key: string, order: 'asc' | 'desc') => void;

  /** Berilsa, tanlash ustuni va ommaviy amallar paneli chiqadi. */
  bulkActions?: (selectedIds: string[]) => ReactNode;

  emptyMessage?: string;
  caption: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowId,
  error = false,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  bulkActions,
  emptyMessage = "Ma'lumot yo'q",
  caption,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllId = useId();

  const ids = rows.map(rowId);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    // Faqat KO'RINIB turgan qatorlar tanlanadi: ko'rinmagan sahifadagi
    // qatorni bilmasdan o'chirib yuborish xavfli.
    setSelected(allSelected ? new Set() : new Set(ids));
  };

  if (error) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--color-danger)] px-6 py-10 text-center"
      >
        <p className="font-medium">Ma’lumot yuklanmadi</p>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Sahifani biroz keyinroq yangilang.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {bulkActions !== undefined && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-line-strong)] px-4 py-3">
          <span className="text-sm tabular-nums">{selected.size} ta tanlandi</span>
          {bulkActions([...selected])}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Bekor qilish
          </Button>
        </div>
      )}

      {/* Keng jadval mobilda gorizontal siljiydi — ustun qisib
          tashlangandan ko'ra siljigani o'qilishi osonroq. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>

          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              {bulkActions !== undefined && (
                <th scope="col" className="w-10 px-3 py-2">
                  <Checkbox
                    id={selectAllId}
                    label="Hammasini tanlash"
                    hideLabel
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={[
                    'px-3 py-2 font-medium text-[var(--color-fg-muted)]',
                    column.align === 'end' ? 'text-right' : 'text-left',
                  ].join(' ')}
                  // Saralash holati ekran o'quvchiga ham yetkaziladi.
                  aria-sort={
                    sortBy === column.key
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {column.sortable === true && onSort !== undefined ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-[var(--color-fg)]"
                      onClick={() =>
                        onSort(
                          column.key,
                          sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc',
                        )
                      }
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {sortBy === column.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={columns.length + (bulkActions !== undefined ? 1 : 0)}
                  className="px-3 py-10 text-center text-[var(--color-fg-muted)]"
                >
                  <span role="status" aria-live="polite">
                    Yuklanmoqda…
                  </span>
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (bulkActions !== undefined ? 1 : 0)}
                  className="px-3 py-10 text-center text-[var(--color-fg-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => {
                const id = rowId(row);

                return (
                  <tr key={id} className="border-b border-[var(--color-line)]">
                    {bulkActions !== undefined && (
                      <td className="px-3 py-2">
                        <Checkbox
                          label="Qatorni tanlash"
                          hideLabel
                          checked={selected.has(id)}
                          onCheckedChange={() => toggle(id)}
                        />
                      </td>
                    )}

                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          'px-3 py-2',
                          column.align === 'end' ? 'text-right tabular-nums' : '',
                        ].join(' ')}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange !== undefined && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          labels={{
            navigation: 'Sahifalash',
            previous: 'Oldingi sahifa',
            next: 'Keyingi sahifa',
            page: (n) => `${n}-sahifa`,
          }}
        />
      )}
    </div>
  );
}
