'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, GlassCard } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { formatDateTime, statusLabel, statusTone } from '@/lib/order-labels';

interface QueueRow {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  shippingRegion: string;
  dealer: { id: string; companyName: string } | null;
  _count: { items: number };
}

/**
 * Yig'ish navbati (CLAUDE.md §7).
 *
 * Eng ESKI buyurtma birinchi: navbat vaqt bo'yicha, summa bo'yicha
 * emas. Katta buyurtmani oldinga o'tkazish kichik dilerni
 * cheksiz kuttirib qo'yardi.
 */
export default function PickingPage() {
  const queue = useQuery({
    queryKey: ['picking-queue'],
    queryFn: () => apiFetch<QueueRow[]>('/warehouse/picking/queue'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Yig‘ish navbati</h1>
        <p className="lead mt-2">
          Zaxiraga olingan buyurtmalar — eng eskisi birinchi. Qadoqlangach tovar ombordan chiqadi.
        </p>
      </div>

      {queue.data?.length === 0 && (
        <GlassCard className="p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Navbat bo‘sh. Buyurtma zaxiraga olingach shu yerda paydo bo‘ladi.
          </p>
        </GlassCard>
      )}

      <DataTable<QueueRow>
        rows={queue.data ?? []}
        loading={queue.isPending}
        error={queue.isError}
        caption="Yig‘ish navbati"
        emptyMessage="Navbat bo‘sh."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'number',
            header: 'Raqam',
            cell: (row) => (
              <Link
                href={`/warehouse/picking/${row.id}`}
                className="tabular-nums underline-offset-4 hover:underline"
              >
                {row.number}
              </Link>
            ),
          },
          { key: 'dealer', header: 'Diler', cell: (row) => row.dealer?.companyName ?? '—' },
          { key: 'region', header: 'Hudud', cell: (row) => row.shippingRegion },
          { key: 'items', header: 'Pozitsiya', cell: (row) => String(row._count.items) },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>,
          },
          { key: 'createdAt', header: 'Sana', cell: (row) => formatDateTime(row.createdAt) },
        ]}
      />
    </div>
  );
}
