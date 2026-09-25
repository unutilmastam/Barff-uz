'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Paginated } from '@barff/types';
import { Badge, Button, GlassCard, Input, Select } from '@barff/ui';
import { ORDER_STATUS_LABELS, formatDateTime, statusLabel, statusTone } from '@/lib/order-labels';
import { apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';

interface OrderRow {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  shippingRegion: string;
  createdAt: string;
  dealer: { id: string; companyName: string } | null;
  _count: { items: number };
}

/** Pul — TIYINDA keladi. */
function money(tiyin: number, currency: string): string {
  const whole = Math.round(tiyin / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${whole} ${currency === 'UZS' ? "so'm" : currency}`;
}

/**
 * Buyurtmalar ro'yxati (CLAUDE.md §8).
 *
 * Filtrlar SERVERDA qo'llanadi — mijozda filtrlash faqat JORIY
 * sahifani kesardi va xodim "buyurtma yo'q" deb o'ylab qolardi.
 */
export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const dealers = useQuery({
    queryKey: ['admin-order-dealers'],
    queryFn: () => apiFetch<{ id: string; companyName: string }[]>('/admin/orders/dealers'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== '') params.set('status', status);
  if (dealerId !== '') params.set('dealerId', dealerId);
  if (region.trim() !== '') params.set('region', region.trim());
  if (search.trim() !== '') params.set('search', search.trim());
  if (from !== '') params.set('from', from);
  if (to !== '') params.set('to', to);

  const orders = useQuery({
    queryKey: ['admin-orders', params.toString()],
    queryFn: () => apiFetch<Paginated<OrderRow>>(`/admin/orders?${params.toString()}`),
  });

  const reset = () => {
    setStatus('');
    setDealerId('');
    setRegion('');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Buyurtmalar</h1>
        <p className="lead mt-2">Holat o‘zgarishi tarixga va audit jurnaliga yoziladi.</p>
      </div>

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Raqam bo‘yicha"
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
            ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />

        <Select
          label="Diler"
          value={dealerId}
          onValueChange={(next) => {
            setDealerId(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...(dealers.data ?? []).map((dealer) => ({
              value: dealer.id,
              label: dealer.companyName,
            })),
          ]}
        />

        <Input
          label="Hudud"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setPage(1);
          }}
        />

        <Input
          label="Sanadan"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />

        <Input
          label="Sanagacha"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />

        <div className="sm:col-span-2 lg:col-span-3">
          <Button variant="ghost" size="sm" onClick={reset}>
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      <DataTable<OrderRow>
        rows={orders.data?.items ?? []}
        page={page}
        totalPages={orders.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={orders.isPending}
        error={orders.isError}
        caption="Buyurtmalar"
        emptyMessage="Tanlovga mos buyurtma topilmadi."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'number',
            header: 'Raqam',
            cell: (row) => (
              <Link
                href={`/orders/${row.id}`}
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
            key: 'total',
            header: 'Summa',
            cell: (row) => <span className="tabular-nums">{money(row.total, row.currency)}</span>,
          },
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
