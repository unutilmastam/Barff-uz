'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Paginated } from '@barff/types';
import { Badge, Button, GlassCard, Input, Select } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { DEALER_STATUS_LABELS, dealerStatusLabel, dealerStatusTone } from '@/lib/dealer-labels';
import { formatDateTime } from '@/lib/order-labels';

interface DealerRow {
  id: string;
  companyName: string;
  taxId: string | null;
  region: string;
  status: string;
  createdAt: string;
  tier: { id: string; code: string; name: string } | null;
  user: { id: string; fullName: string; email: string; phone: string | null } | null;
}

/**
 * Dilerlar ro'yxati (CLAUDE.md §8 — "Operations: dealers").
 *
 * NEGA BU EKRAN FAZA 2 DARVOZASINING BIR QISMI.
 *
 * S22 da ro'yxatdan o'tish va tasdiqlash API'si qurilgan, lekin
 * panelda ekran YO'Q edi. Ya'ni yangi diler faqat `curl` bilan
 * tasdiqlanardi. Darvoza sharti esa "diler QO'LDA aralashuvsiz
 * buyurtma bera olishi" — xodim arizani ko'ra olmasa, bu shart
 * bajarilmaydi.
 *
 * Boshlang'ich filtr ATAYLAB `PENDING`: xodim panelni ochganda
 * birinchi navbatda KUTAYOTGAN arizalarni ko'rishi kerak. Arizani
 * e'tibordan chetda qoldirish — yo'qotilgan mijoz.
 */
export default function DealersPage() {
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== '') params.set('status', status);
  if (search.trim() !== '') params.set('search', search.trim());

  const dealers = useQuery({
    queryKey: ['admin-dealers', params.toString()],
    queryFn: () => apiFetch<Paginated<DealerRow>>(`/admin/dealers?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Dilerlar</h1>
        <p className="lead mt-2">
          Tasdiqlangan diler portalga kira oladi va buyurtma bera oladi. Har bir holat o‘zgarishi
          audit jurnaliga yoziladi.
        </p>
      </div>

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2">
        <Input
          label="Kompaniya yoki STIR"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          label="Holat"
          value={status}
          onValueChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...Object.entries(DEALER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />

        <div className="sm:col-span-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('');
              setSearch('');
              setPage(1);
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      <DataTable<DealerRow>
        rows={dealers.data?.items ?? []}
        page={page}
        totalPages={dealers.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={dealers.isPending}
        error={dealers.isError}
        caption="Dilerlar"
        emptyMessage="Tanlovga mos diler topilmadi."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'companyName',
            header: 'Kompaniya',
            cell: (row) => (
              <Link href={`/dealers/${row.id}`} className="underline-offset-4 hover:underline">
                {row.companyName}
              </Link>
            ),
          },
          {
            key: 'contact',
            header: 'Kontakt',
            cell: (row) => (
              <span className="text-sm">
                {row.user?.fullName ?? '—'}
                <span className="block text-xs text-[var(--color-fg-subtle)]">
                  {row.user?.phone != null ? formatPhone(row.user.phone) : (row.user?.email ?? '')}
                </span>
              </span>
            ),
          },
          { key: 'region', header: 'Hudud', cell: (row) => row.region },
          { key: 'tier', header: 'Daraja', cell: (row) => row.tier?.name ?? '—' },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => (
              <Badge tone={dealerStatusTone(row.status)}>{dealerStatusLabel(row.status)}</Badge>
            ),
          },
          {
            key: 'createdAt',
            header: 'Ariza sanasi',
            cell: (row) => formatDateTime(row.createdAt),
          },
        ]}
      />
    </div>
  );
}
