'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { STOCK_MOVEMENT_TYPES, type Localized, type Paginated } from '@barff/types';
import { Badge, Button, GlassCard, Input, Select } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { movementLabel, movementTone } from '@/lib/stock-labels';
import { formatDateTime } from '@/lib/order-labels';

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface MovementRow {
  id: string;
  type: string;
  quantity: number;
  quantityAfter: number;
  reservedAfter: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  warehouse: { id: string; code: string; name: string };
  relatedWarehouse: { id: string; code: string; name: string } | null;
  productVariant: {
    id: string;
    sku: string;
    volumeMl: number;
    product: { id: string; slug: string; name: Localized };
  };
  actor: { id: string; fullName: string } | null;
}

const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

/**
 * Harakatlar jurnali (CLAUDE.md §7, §23).
 *
 * Bu ekranda TAHRIRLASH YO'Q va bo'lmaydi: jurnal qo'shiladigan,
 * o'zgartirilmaydigan yozuv. Xato harakat TUZATISH (`ADJUSTMENT`)
 * bilan to'g'rilanadi — shunda ikkala qator ham ko'rinib turadi va
 * "nima bo'lgani" savoli javobsiz qolmaydi.
 */
export default function MovementsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiFetch<Warehouse[]>('/warehouse/warehouses'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (warehouseId !== '') params.set('warehouseId', warehouseId);
  if (type !== '') params.set('type', type);
  if (from !== '') params.set('from', from);
  if (to !== '') params.set('to', to);

  const movements = useQuery({
    queryKey: ['warehouse-movements', params.toString()],
    queryFn: () => apiFetch<Paginated<MovementRow>>(`/warehouse/movements?${params.toString()}`),
  });

  const reset = () => {
    setWarehouseId('');
    setType('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Harakatlar</h1>
        <p className="lead mt-2">
          Qo‘shiladigan jurnal — yozuv o‘zgartirilmaydi. Xato harakat tuzatish bilan to‘g‘rilanadi.
        </p>
      </div>

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Ombor"
          value={warehouseId}
          onValueChange={(next) => {
            setWarehouseId(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...(warehouses.data ?? []).map((warehouse) => ({
              value: warehouse.id,
              label: `${warehouse.code} — ${warehouse.name}`,
            })),
          ]}
        />

        <Select
          label="Turi"
          value={type}
          onValueChange={(next) => {
            setType(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...STOCK_MOVEMENT_TYPES.map((value) => ({ value, label: movementLabel(value) })),
          ]}
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

        <div className="sm:col-span-2 lg:col-span-4">
          <Button variant="ghost" size="sm" onClick={reset}>
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      <DataTable<MovementRow>
        rows={movements.data?.items ?? []}
        page={page}
        totalPages={movements.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={movements.isPending}
        error={movements.isError}
        caption="Harakatlar"
        emptyMessage="Tanlovga mos harakat topilmadi."
        rowId={(row) => row.id}
        columns={[
          { key: 'createdAt', header: 'Sana', cell: (row) => formatDateTime(row.createdAt) },
          {
            key: 'type',
            header: 'Turi',
            cell: (row) => <Badge tone={movementTone(row.type)}>{movementLabel(row.type)}</Badge>,
          },
          {
            key: 'product',
            header: 'Mahsulot',
            cell: (row) => (
              <span>
                {text(row.productVariant.product.name, row.productVariant.sku)}
                <span className="block text-xs text-[var(--color-fg-subtle)]">
                  {row.productVariant.sku} · {row.productVariant.volumeMl} ml
                </span>
              </span>
            ),
          },
          {
            key: 'warehouse',
            header: 'Ombor',
            cell: (row) => (
              <span>
                {row.warehouse.code}
                {row.relatedWarehouse !== null && (
                  <span className="block text-xs text-[var(--color-fg-subtle)]">
                    {row.quantity < 0 ? '→' : '←'} {row.relatedWarehouse.code}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: 'quantity',
            header: 'Miqdor',
            align: 'end',
            cell: (row) => (
              <span className="tabular-nums">
                {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
              </span>
            ),
          },
          {
            key: 'after',
            header: 'Keyin',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{row.quantityAfter}</span>,
          },
          {
            key: 'reason',
            header: 'Sabab / havola',
            cell: (row) =>
              [row.reason, row.reference]
                .filter((part) => part !== null && part !== '')
                .join(' · ') || '—',
          },
          { key: 'actor', header: 'Kim', cell: (row) => row.actor?.fullName ?? 'Tizim' },
        ]}
      />
    </div>
  );
}
