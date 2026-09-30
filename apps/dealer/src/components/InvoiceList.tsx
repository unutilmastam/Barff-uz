'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Paginated } from '@barff/types';
import { Badge, Button, GlassCard, Pagination, Skeleton } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/money';

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  outstanding: number;
  issuedAt: string | null;
  dueAt: string | null;
  order: { number: string } | null;
}

const LABELS: Record<string, string> = {
  ISSUED: 'To‘lanmagan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
  CANCELLED: 'Bekor qilingan',
};

const TONES: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  ISSUED: 'brand',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  CANCELLED: 'neutral',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function overdue(row: InvoiceRow): boolean {
  if (row.dueAt === null) return false;
  if (row.status !== 'ISSUED' && row.status !== 'PARTIALLY_PAID') return false;

  return new Date(row.dueAt).getTime() < Date.now();
}

/**
 * Diler hisob-fakturalari (CLAUDE.md §5).
 *
 * BOSHLANG'ICH KO'RINISH — TO'LANMAGANLAR. Dilerning savoli
 * "qancha to'ladim" emas, "qancha QARZDORMAN".
 *
 * QORALAMA HUJJATLAR BU YERGA UMUMAN KELMAYDI — server ularni
 * chiqarmaydi (`docs/BILLING-POLICY.md` §7).
 */
export function InvoiceList() {
  const [page, setPage] = useState(1);
  const [openOnly, setOpenOnly] = useState(true);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (openOnly) params.set('openOnly', 'true');

  const invoices = useQuery({
    queryKey: ['dealer-invoices', params.toString()],
    queryFn: () => apiFetch<Paginated<InvoiceRow>>(`/dealer/invoices?${params.toString()}`),
  });

  if (invoices.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (invoices.isError) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Hisob-fakturalarni yuklab bo‘lmadi.
      </p>
    );
  }

  const rows = invoices.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={openOnly ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setOpenOnly(!openOnly);
            setPage(1);
          }}
        >
          {openOnly ? 'To‘lanmaganlar' : 'Hammasi'}
        </Button>
      </div>

      {rows.length === 0 ? (
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--color-fg-muted)]">
            {openOnly ? 'To‘lanmagan hisob-faktura yo‘q.' : 'Hisob-faktura yo‘q.'}
          </p>
        </GlassCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <GlassCard className="p-4">
                <Link
                  href={`/invoices/${row.id}`}
                  className="flex flex-wrap items-center gap-3 underline-offset-4 hover:underline"
                >
                  <span className="font-medium tabular-nums">{row.number}</span>
                  <Badge tone={TONES[row.status] ?? 'neutral'}>
                    {LABELS[row.status] ?? row.status}
                  </Badge>
                  {overdue(row) && <Badge tone="danger">Muddati o‘tgan</Badge>}
                  <span className="ml-auto tabular-nums">
                    {formatMoney(row.total, row.currency)}
                  </span>
                </Link>

                <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                  {row.order !== null && `Buyurtma ${row.order.number} · `}
                  {row.issuedAt !== null && `berilgan ${formatDate(row.issuedAt)}`}
                  {row.dueAt !== null && ` · muddat ${formatDate(row.dueAt)}`}
                </p>

                {row.outstanding > 0 && (
                  <p className="mt-1 text-sm">
                    Qolgan:{' '}
                    <strong className="tabular-nums">
                      {formatMoney(row.outstanding, row.currency)}
                    </strong>
                  </p>
                )}
              </GlassCard>
            </li>
          ))}
        </ul>
      )}

      {(invoices.data?.meta.totalPages ?? 1) > 1 && (
        <Pagination
          page={page}
          totalPages={invoices.data?.meta.totalPages ?? 1}
          onPageChange={setPage}
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
