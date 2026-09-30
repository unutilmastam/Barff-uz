'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PAYMENT_METHODS, type Paginated } from '@barff/types';
import { Badge, Button, Dialog, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { downloadFile } from '@/lib/download';
import { formatMinor, paymentMethodLabel } from '@/lib/billing-labels';
import { formatDateTime } from '@/lib/order-labels';

interface PaymentRow {
  id: string;
  number: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  receivedAt: string;
  allocated: number;
  unallocated: number;
  dealer: { id: string; companyName: string } | null;
  recordedBy: { id: string; fullName: string } | null;
  allocations: { id: string; amount: number; invoice: { id: string; number: string } }[];
}

interface DealerOption {
  id: string;
  companyName: string;
}

interface Balance {
  outstanding: number;
  invoiced: number;
  paid: number;
  unallocated: number;
  dealer: { id: string; companyName: string; creditLimit: number | null } | null;
}

/** Bugun — `<input type="date">` uchun. */
function today(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * To'lovlar (CLAUDE.md §10, `ROADMAP.md` S36).
 *
 * TO'LOV DILERGA TUSHADI, hisob-fakturaga emas: diler ko'pincha
 * bitta o'tkazma bilan bir nechta hujjatni yopadi
 * (`docs/BILLING-POLICY.md` §6).
 *
 * Taqsimot avtomatik va ESKISIDAN boshlanadi. Qo'lda taqsimlash
 * ham bor, lekin u ISTISNO — shuning uchun forma avtomatik
 * variantdan boshlanadi.
 */
export default function PaymentsPage() {
  const client = useQueryClient();

  const [dealerId, setDealerId] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dealers = useQuery({
    queryKey: ['order-dealers'],
    queryFn: () => apiFetch<DealerOption[]>('/admin/orders/dealers'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (dealerId !== '') params.set('dealerId', dealerId);
  if (method !== '') params.set('method', method);
  if (search.trim() !== '') params.set('search', search.trim());

  const payments = useQuery({
    queryKey: ['payments', params.toString()],
    queryFn: () => apiFetch<Paginated<PaymentRow>>(`/billing/payments?${params.toString()}`),
  });

  const record = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/billing/payments', { method: 'POST', body }),
    onSuccess: async () => {
      setRecording(false);
      setError(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments'] }),
        client.invalidateQueries({ queryKey: ['invoices'] }),
        client.invalidateQueries({ queryKey: ['balance'] }),
      ]);
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'To‘lovni yozib bo‘lmadi.'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-3">To‘lovlar</h1>
          <p className="lead mt-2">Kelgan pul va u qaysi hujjatlarni yopgani.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              downloadFile('/billing/exports/payments.csv', 'tolovlar.csv').catch((err) =>
                setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi.'),
              )
            }
          >
            CSV
          </Button>

          <Button onClick={() => setRecording(true)}>To‘lov yozish</Button>
        </div>
      </div>

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Raqam yoki havola"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
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

        <Select
          label="Usul"
          value={method}
          onValueChange={(next) => {
            setMethod(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...PAYMENT_METHODS.map((value) => ({ value, label: paymentMethodLabel(value) })),
          ]}
        />

        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDealerId('');
              setMethod('');
              setSearch('');
              setPage(1);
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      {dealerId !== '' && <BalanceCard dealerId={dealerId} />}

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <DataTable<PaymentRow>
        rows={payments.data?.items ?? []}
        page={page}
        totalPages={payments.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={payments.isPending}
        error={payments.isError}
        caption="To‘lovlar"
        emptyMessage="To‘lov topilmadi."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'number',
            header: 'Raqam',
            cell: (row) => <span className="tabular-nums">{row.number}</span>,
          },
          { key: 'dealer', header: 'Diler', cell: (row) => row.dealer?.companyName ?? '—' },
          {
            key: 'amount',
            header: 'Summa',
            align: 'end',
            cell: (row) => (
              <span className="tabular-nums">{formatMinor(row.amount, row.currency)}</span>
            ),
          },
          {
            key: 'allocations',
            header: 'Yopgan hujjatlar',
            cell: (row) =>
              row.allocations.length === 0 ? (
                <span className="text-[var(--color-fg-subtle)]">taqsimlanmagan</span>
              ) : (
                <span className="text-xs">
                  {row.allocations.map((a) => a.invoice.number).join(', ')}
                </span>
              ),
          },
          {
            key: 'unallocated',
            header: 'Qoldi',
            align: 'end',
            cell: (row) =>
              row.unallocated === 0 ? (
                '—'
              ) : (
                <span className="tabular-nums">{formatMinor(row.unallocated, row.currency)}</span>
              ),
          },
          {
            key: 'method',
            header: 'Usul',
            cell: (row) => <Badge tone="neutral">{paymentMethodLabel(row.method)}</Badge>,
          },
          {
            key: 'receivedAt',
            header: 'Kelgan sana',
            cell: (row) => formatDateTime(row.receivedAt),
          },
        ]}
      />

      {recording && (
        <RecordDialog
          dealers={dealers.data ?? []}
          pending={record.isPending}
          onClose={() => {
            setRecording(false);
            setError(null);
          }}
          onSubmit={(body) => record.mutate(body)}
        />
      )}
    </div>
  );
}

/** Diler balansi — HISOBLANADI, saqlanmaydi (`docs/BILLING-POLICY.md` §2). */
function BalanceCard({ dealerId }: { dealerId: string }) {
  const balance = useQuery({
    queryKey: ['balance', dealerId],
    queryFn: () => apiFetch<Balance>(`/billing/dealers/${dealerId}/balance`),
  });

  if (balance.data === undefined) return null;

  const data = balance.data;

  return (
    <GlassCard className="grid gap-4 p-5 sm:grid-cols-4">
      <Stat label="Berilgan" value={formatMinor(data.invoiced)} />
      <Stat label="To‘langan" value={formatMinor(data.paid)} />
      <Stat
        label={data.outstanding >= 0 ? 'Qarz' : 'Oldindan to‘lov'}
        value={formatMinor(Math.abs(data.outstanding))}
        strong
      />
      <Stat
        label="Kredit limiti"
        value={
          data.dealer?.creditLimit == null ? 'sozlanmagan' : formatMinor(data.dealer.creditLimit)
        }
      />
    </GlassCard>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
      <p className={`mt-0.5 tabular-nums ${strong === true ? 'text-lg font-semibold' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}

function RecordDialog({
  dealers,
  pending,
  onClose,
  onSubmit,
}: {
  dealers: DealerOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [dealerId, setDealerId] = useState('');
  const [major, setMajor] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [receivedAt, setReceivedAt] = useState(today());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  /*
    FOYDALANUVCHI SO'MDA KIRITADI, SERVER TIYINDA OLADI.

    Aylantirish FAQAT shu yerda bo'ladi va u BUTUN SONGA
    yaxlitlanadi: kasr tiyin degan narsa yo'q va server uni
    baribir rad etardi (`docs/BILLING-POLICY.md` §1).
  */
  const parsed = Number.parseFloat(major.replace(',', '.'));
  const minor = Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
  const amountValid = Number.isInteger(minor) && minor > 0;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="To‘lov yozish"
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || dealerId === '' || !amountValid}
            onClick={() =>
              onSubmit({
                dealerId,
                amount: minor,
                method,
                receivedAt,
                ...(reference.trim() !== '' ? { reference: reference.trim() } : {}),
                ...(note.trim() !== '' ? { note: note.trim() } : {}),
              })
            }
          >
            Saqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Diler"
          value={dealerId}
          onValueChange={setDealerId}
          placeholder="Tanlang"
          options={dealers.map((dealer) => ({ value: dealer.id, label: dealer.companyName }))}
        />

        <Input
          label="Summa (so‘m)"
          required
          inputMode="decimal"
          value={major}
          onChange={(event) => setMajor(event.target.value)}
          hint="Eng eski qarzdan boshlab avtomatik taqsimlanadi."
          error={major !== '' && !amountValid ? 'Noldan katta summa kiriting.' : undefined}
        />

        <Select
          label="Usul"
          value={method}
          onValueChange={setMethod}
          options={PAYMENT_METHODS.map((value) => ({ value, label: paymentMethodLabel(value) }))}
        />

        {/*
          PUL QACHON KELGANI — yozuv qachon kiritilgani EMAS.

          Ikkalasini bitta maydonga yig'ish oy yopilishini
          buzardi: kecha kelgan pul bugun kiritilsa, u kechagi
          oyga tushishi kerak.
        */}
        <Input
          label="Kelgan sana"
          type="date"
          value={receivedAt}
          onChange={(event) => setReceivedAt(event.target.value)}
          hint="Pul qachon kelgani — yozuv qachon kiritilgani emas."
        />

        <Input
          label="Havola"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          hint="Bank o‘tkazmasi yoki kvitansiya raqami."
        />

        <Textarea
          label="Izoh"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
