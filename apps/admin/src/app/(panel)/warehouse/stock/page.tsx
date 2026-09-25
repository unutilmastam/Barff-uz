'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Localized, type Paginated } from '@barff/types';
import { Badge, Button, Checkbox, Dialog, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { MANUAL_TYPES, available, isLow, movementLabel } from '@/lib/stock-labels';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  region: string;
  isDefault: boolean;
}

interface StockRow {
  id: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number | null;
  warehouse: { id: string; code: string; name: string };
  productVariant: {
    id: string;
    sku: string;
    volumeMl: number;
    unitsPerPack: number | null;
    product: { id: string; slug: string; name: Localized };
  };
}

const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

type MovementForm = {
  row: StockRow;
  mode: 'movement' | 'adjustment' | 'threshold';
};

/**
 * Qoldiqlar (CLAUDE.md §7).
 *
 * QOLDIQ BU YERDA TAHRIRLANMAYDI. Raqamni to'g'ridan-to'g'ri
 * o'zgartiradigan maydon ATAYLAB yo'q: har bir o'zgarish HARAKAT
 * bo'lishi kerak, aks holda raqamning qayerdan kelgani yo'qoladi
 * (S30 DoD). Shuning uchun ekranda "tahrirlash" emas, "kelim",
 * "chiqim" va "tuzatish" bor.
 */
export default function StockPage() {
  const client = useQueryClient();

  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<MovementForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiFetch<Warehouse[]>('/warehouse/warehouses'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (warehouseId !== '') params.set('warehouseId', warehouseId);
  if (search.trim() !== '') params.set('search', search.trim());
  if (lowOnly) params.set('lowOnly', 'true');

  const stock = useQuery({
    queryKey: ['warehouse-stock', params.toString()],
    queryFn: () => apiFetch<Paginated<StockRow>>(`/warehouse/stock?${params.toString()}`),
  });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['warehouse-stock'] });
    await client.invalidateQueries({ queryKey: ['warehouse-movements'] });
  };

  const close = () => {
    setForm(null);
    setError(null);
  };

  const record = useMutation({
    mutationFn: (body: {
      path: string;
      payload: Record<string, unknown>;
      method?: 'POST' | 'PUT';
    }) => apiFetch(body.path, { method: body.method ?? 'POST', body: body.payload }),
    onSuccess: async () => {
      close();
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Amalni bajarib bo‘lmadi.'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Qoldiqlar</h1>
        <p className="lead mt-2">
          Qoldiq faqat HARAKAT orqali o‘zgaradi — har bir o‘zgarish jurnalda qoladi.
        </p>
      </div>

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Kod yoki slug"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

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

        <div className="flex items-end">
          <Checkbox
            label="Faqat kam qolganlar"
            checked={lowOnly}
            onCheckedChange={(checked) => {
              setLowOnly(checked === true);
              setPage(1);
            }}
          />
        </div>
      </GlassCard>

      <DataTable<StockRow>
        rows={stock.data?.items ?? []}
        page={page}
        totalPages={stock.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={stock.isPending}
        error={stock.isError}
        caption="Qoldiqlar"
        emptyMessage="Tanlovga mos qoldiq topilmadi."
        rowId={(row) => row.id}
        columns={[
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
          { key: 'warehouse', header: 'Ombor', cell: (row) => row.warehouse.code },
          {
            key: 'quantity',
            header: 'Qoldiq',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{row.quantity}</span>,
          },
          {
            key: 'reserved',
            header: 'Band',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{row.reservedQuantity}</span>,
          },
          {
            key: 'available',
            header: 'Mavjud',
            align: 'end',
            cell: (row) => (
              <span className="flex items-center justify-end gap-2 tabular-nums">
                {available(row.quantity, row.reservedQuantity)}
                {isLow(row.quantity, row.reservedQuantity, row.lowStockThreshold) && (
                  <Badge tone="warning">Kam</Badge>
                )}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Amal',
            cell: (row) => (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setForm({ row, mode: 'movement' })}
                >
                  Harakat
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm({ row, mode: 'adjustment' })}
                >
                  Tuzatish
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm({ row, mode: 'threshold' })}
                >
                  Chegara
                </Button>
              </span>
            ),
          },
        ]}
      />

      {form !== null && (
        <StockDialog
          form={form}
          error={error}
          pending={record.isPending}
          onClose={close}
          onSubmit={(body) => record.mutate(body)}
        />
      )}
    </div>
  );
}

/** Harakat, tuzatish va chegara — bitta oynada, uch rejimda. */
function StockDialog({
  form,
  error,
  pending,
  onClose,
  onSubmit,
}: {
  form: MovementForm;
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: {
    path: string;
    payload: Record<string, unknown>;
    method?: 'POST' | 'PUT';
  }) => void;
}) {
  const { row, mode } = form;
  const [type, setType] = useState<string>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [threshold, setThreshold] = useState(
    row.lowStockThreshold === null ? '' : String(row.lowStockThreshold),
  );

  const amount = Number(quantity);
  const valid =
    mode === 'threshold'
      ? true
      : Number.isInteger(amount) &&
        amount !== 0 &&
        (mode !== 'adjustment' || reason.trim().length > 0);

  const title =
    mode === 'movement' ? 'Harakat' : mode === 'adjustment' ? 'Tuzatish' : 'Kam qoldiq chegarasi';

  const submit = () => {
    if (mode === 'threshold') {
      onSubmit({
        path: `/warehouse/stock/${row.warehouse.id}/${row.productVariant.id}/threshold`,
        method: 'PUT',
        payload: { lowStockThreshold: threshold.trim() === '' ? null : Number(threshold) },
      });
      return;
    }

    onSubmit({
      path: mode === 'adjustment' ? '/warehouse/adjustments' : '/warehouse/movements',
      payload: {
        warehouseId: row.warehouse.id,
        productVariantId: row.productVariant.id,
        type: mode === 'adjustment' ? 'ADJUSTMENT' : type,
        quantity: amount,
        ...(reason.trim() !== '' ? { reason: reason.trim() } : {}),
        ...(reference.trim() !== '' ? { reference: reference.trim() } : {}),
      },
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} disabled={pending || !valid}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-fg-muted)]">
          {text(row.productVariant.product.name, row.productVariant.sku)} · {row.productVariant.sku}{' '}
          · {row.warehouse.code}
          <span className="block text-xs text-[var(--color-fg-subtle)]">
            Joriy qoldiq: {row.quantity} · band: {row.reservedQuantity}
          </span>
        </p>

        {error !== null && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        {mode === 'threshold' ? (
          <Input
            label="Chegara (dona)"
            type="number"
            min={0}
            value={threshold}
            hint="Bo‘sh — kuzatilmaydi."
            onChange={(event) => setThreshold(event.target.value)}
          />
        ) : (
          <>
            {mode === 'movement' && (
              <Select
                label="Turi"
                value={type}
                onValueChange={setType}
                options={MANUAL_TYPES.map((value) => ({ value, label: movementLabel(value) }))}
              />
            )}

            <Input
              label="Miqdor (dona)"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              hint={
                mode === 'adjustment'
                  ? 'Manfiy son kamaytiradi: -5 — besh dona kam chiqdi.'
                  : 'Musbat son. Kamaytirish uchun turini «Chiqim» qiling.'
              }
            />

            <Textarea
              label="Sabab"
              rows={2}
              required={mode === 'adjustment'}
              hint={mode === 'adjustment' ? 'SHART — tuzatish sababsiz yozilmaydi.' : 'Ixtiyoriy.'}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            <Input
              label="Havola"
              value={reference}
              hint="Hujjat raqami, buyurtma raqami va h.k."
              onChange={(event) => setReference(event.target.value)}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
