'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { INVOICE_STATUSES, type Paginated } from '@barff/types';
import { Badge, Button, Dialog, GlassCard, Input, Select } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { downloadFile } from '@/lib/download';
import {
  formatMinor,
  invoiceStatusLabel,
  invoiceStatusTone,
  isOverdue,
} from '@/lib/billing-labels';
import { formatDateTime } from '@/lib/order-labels';

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  allocated: number;
  outstanding: number;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  dealer: { id: string; companyName: string } | null;
  order: { id: string; number: string } | null;
}

interface DeliveredOrder {
  id: string;
  number: string;
  total: number;
  currency: string;
  dealer: { companyName: string } | null;
}

/**
 * Hisob-fakturalar (CLAUDE.md §10, `ROADMAP.md` S36).
 *
 * BOSHLANG'ICH KO'RINISH — QARZI QOLGANLAR. Buxgalterning savoli
 * "bu oyda nima bo'ldi" emas, "kim TO'LAMAGAN".
 *
 * Filtr SERVERDA (`openOnly`): mijozda filtrlash sahifalashni
 * buzardi — sahifadan to'langanlari olib tashlanib, "jami" eski
 * qiymatda qolardi (S34 da o'lchangan).
 */
export default function InvoicesPage() {
  const client = useQueryClient();

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== '') params.set('status', status);
  else if (openOnly) params.set('openOnly', 'true');
  if (overdueOnly) params.set('overdueOnly', 'true');
  if (search.trim() !== '') params.set('search', search.trim());

  const invoices = useQuery({
    queryKey: ['invoices', params.toString()],
    queryFn: () => apiFetch<Paginated<InvoiceRow>>(`/billing/invoices?${params.toString()}`),
  });

  const create = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch('/billing/invoices', { method: 'POST', body: { orderId } }),
    onSuccess: async () => {
      setCreating(false);
      setError(null);
      await client.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Hisob-faktura berib bo‘lmadi.'),
  });

  const rows = invoices.data?.items ?? [];
  const overdue = rows.filter((row) => isOverdue(row.status, row.dueAt)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-3">Hisob-fakturalar</h1>
          <p className="lead mt-2">Qarzi qolgan hujjatlar — to‘lanmagan ish.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/*
            CSV, PDF EMAS. Rasmiy hisob-faktura shakli BARFF dan
            kelmagan (Q17) va uni o'ylab topish soliq hujjatini
            soxtalashtirish bo'lardi. Chop etiladigan ko'rinish
            esa hujjat sahifasida.
          */}
          <Button
            variant="secondary"
            onClick={() =>
              downloadFile('/billing/exports/invoices.csv', 'hisob-fakturalar.csv').catch((err) =>
                setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi.'),
              )
            }
          >
            CSV
          </Button>

          <Button onClick={() => setCreating(true)}>Hisob-faktura berish</Button>
        </div>
      </div>

      {overdue > 0 && (
        <GlassCard className="border-[var(--color-warning)] p-4">
          <p className="text-sm">
            <strong>{overdue} ta hujjatning muddati o‘tgan.</strong>
          </p>
        </GlassCard>
      )}

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Raqam yoki diler"
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
            ...INVOICE_STATUSES.map((value) => ({ value, label: invoiceStatusLabel(value) })),
          ]}
        />

        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          {/*
            ANIQ HOLAT TANLANGANDA "QARZI QOLGANLAR" O'CHIQ.

            Ikkalasi bitta ustunga tegadi: holat tanlangan bo'lsa
            bu tugma hech nima qilmaydi va yonib turgani
            ishlayotgandek ko'rinardi (S34 dagi bilan bir xil).
          */}
          <Button
            variant={openOnly && status === '' ? 'primary' : 'ghost'}
            size="sm"
            disabled={status !== ''}
            onClick={() => {
              setOpenOnly(!openOnly);
              setPage(1);
            }}
          >
            {status !== '' ? 'Holat bo‘yicha' : openOnly ? 'Qarzi qolganlar' : 'Hammasi'}
          </Button>

          <Button
            variant={overdueOnly ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setOverdueOnly(!overdueOnly);
              setPage(1);
            }}
          >
            Muddati o‘tganlar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('');
              setSearch('');
              setOverdueOnly(false);
              setOpenOnly(true);
              setPage(1);
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <DataTable<InvoiceRow>
        rows={rows}
        page={page}
        totalPages={invoices.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={invoices.isPending}
        error={invoices.isError}
        caption="Hisob-fakturalar"
        emptyMessage={
          openOnly && status === '' ? 'Qarzi qolgan hujjat yo‘q.' : 'Hisob-faktura topilmadi.'
        }
        rowId={(row) => row.id}
        columns={[
          {
            key: 'number',
            header: 'Raqam',
            cell: (row) => (
              <Link
                href={`/finance/invoices/${row.id}`}
                className="tabular-nums underline-offset-4 hover:underline"
              >
                {row.number}
              </Link>
            ),
          },
          { key: 'dealer', header: 'Diler', cell: (row) => row.dealer?.companyName ?? '—' },
          { key: 'order', header: 'Buyurtma', cell: (row) => row.order?.number ?? '—' },
          {
            key: 'total',
            header: 'Summa',
            align: 'end',
            cell: (row) => (
              <span className="tabular-nums">{formatMinor(row.total, row.currency)}</span>
            ),
          },
          {
            key: 'outstanding',
            header: 'Qolgan',
            align: 'end',
            cell: (row) => (
              <span className="tabular-nums">{formatMinor(row.outstanding, row.currency)}</span>
            ),
          },
          {
            key: 'dueAt',
            header: 'Muddat',
            cell: (row) =>
              row.dueAt === null ? (
                '—'
              ) : (
                <span
                  className={isOverdue(row.status, row.dueAt) ? 'text-[var(--color-danger)]' : ''}
                >
                  {formatDateTime(row.dueAt)}
                </span>
              ),
          },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => (
              <Badge tone={invoiceStatusTone(row.status)}>{invoiceStatusLabel(row.status)}</Badge>
            ),
          },
        ]}
      />

      {creating && (
        <CreateDialog
          pending={create.isPending}
          onClose={() => {
            setCreating(false);
            setError(null);
          }}
          onSubmit={(orderId) => create.mutate(orderId)}
        />
      )}
    </div>
  );
}

/**
 * Hisob-faktura FAQAT YETKAZILGAN buyurtmadan beriladi
 * (`docs/BILLING-POLICY.md` §3), shuning uchun ro'yxat ham
 * faqat shundaylardan quriladi — bo'lmaydigan tanlovni
 * ko'rsatib, keyin `409` bilan rad etish foydasiz.
 */
function CreateDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (orderId: string) => void;
}) {
  const [orderId, setOrderId] = useState('');

  const orders = useQuery({
    queryKey: ['invoiceable-orders'],
    queryFn: () => apiFetch<Paginated<DeliveredOrder>>('/admin/orders?status=DELIVERED&limit=60'),
  });

  /*
    Hisob-fakturasi BOR buyurtma ro'yxatda qolmasligi kerak.
    Server buni `409` bilan rad etadi, lekin tanlovda ko'rsatib
    turish foydalanuvchini bekorga ishlatardi.
  */
  const existing = useQuery({
    queryKey: ['invoices', 'all-order-ids'],
    queryFn: () => apiFetch<Paginated<InvoiceRow>>('/billing/invoices?limit=60'),
  });

  const used = new Set((existing.data?.items ?? []).map((row) => row.order?.id));
  const candidates = (orders.data?.items ?? []).filter((order) => !used.has(order.id));

  const loading = orders.isPending || existing.isPending;
  const empty = !loading && candidates.length === 0;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Hisob-faktura berish"
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button disabled={pending || orderId === ''} onClick={() => onSubmit(orderId)}>
            Yaratish
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {loading && <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>}

        {empty ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Hisob-faktura berish mumkin bo‘lgan buyurtma yo‘q. Hujjat faqat{' '}
            <strong>YETKAZILGAN</strong> buyurtmadan beriladi va har bir buyurtmaga bittadan.
          </p>
        ) : (
          !loading && (
            <Select
              label="Buyurtma"
              value={orderId}
              onValueChange={setOrderId}
              placeholder="Tanlang"
              hint="Faqat yetkazilgan va hisob-fakturasi yo‘q buyurtmalar."
              options={candidates.map((order) => ({
                value: order.id,
                label: `${order.number} — ${order.dealer?.companyName ?? '—'} · ${formatMinor(order.total, order.currency)}`,
              }))}
            />
          )
        )}
      </div>
    </Dialog>
  );
}
