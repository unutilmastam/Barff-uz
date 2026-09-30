'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Dialog, GlassCard, Textarea } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import {
  formatMinor,
  invoiceStatusLabel,
  invoiceStatusTone,
  isOverdue,
  paymentMethodLabel,
} from '@/lib/billing-labels';
import { formatDateTime } from '@/lib/order-labels';

interface Localized {
  uz?: string;
  ru?: string;
  en?: string;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  currency: string;
  allocated: number;
  outstanding: number;
  issuedAt: string | null;
  dueAt: string | null;
  cancelReason: string | null;
  internalNote: string | null;
  createdAt: string;
  dealer: { id: string; companyName: string; region: string } | null;
  order: { id: string; number: string; status: string; createdAt: string } | null;
  items: {
    id: string;
    sku: string;
    productName: Localized | string;
    volumeMl: number | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  allocations: {
    id: string;
    amount: number;
    createdAt: string;
    payment: {
      id: string;
      number: string;
      method: string;
      receivedAt: string;
      reference: string | null;
    };
  }[];
}

function productName(value: Localized | string): string {
  if (typeof value === 'string') return value;

  return value.uz ?? value.ru ?? value.en ?? '—';
}

/**
 * Hisob-faktura tafsiloti (`ROADMAP.md` S36).
 *
 * CHOP ETISHGA TAYYOR, LEKIN RASMIY SHAKL EMAS.
 *
 * O'zbekiston hisob-faktura shakli va QQS qoidalari BARFF dan
 * kelmagan (`docs/OPEN-QUESTIONS.md` Q17). Shaklni o'ylab topish
 * soliq hujjatini soxtalashtirish bo'lardi, shuning uchun bu
 * ko'rinish ODDIY va u rasmiy hujjat EMASLIGI ochiq yozilgan.
 *
 * PDF generatori ham qo'shilmagan: brauzerning «Chop etish → PDF
 * sifatida saqlash» buyrug'i yangi bog'liqliksiz o'sha ishni
 * qiladi (`docs/BILLING-POLICY.md` §0).
 */
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const client = useQueryClient();

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoice = useQuery({
    queryKey: ['invoice', params.id],
    queryFn: () => apiFetch<Invoice>(`/billing/invoices/${params.id}`),
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['invoice', params.id] }),
      client.invalidateQueries({ queryKey: ['invoices'] }),
    ]);
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiRequestError ? err.message : 'Amal bajarilmadi.');

  const issue = useMutation({
    mutationFn: () => apiFetch(`/billing/invoices/${params.id}/issue`, { method: 'POST' }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const cancel = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/billing/invoices/${params.id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: async () => {
      setCancelling(false);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  if (invoice.isPending) {
    return <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>;
  }

  if (invoice.isError || invoice.data === undefined) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Hisob-fakturani yuklab bo‘lmadi.
      </p>
    );
  }

  const data = invoice.data;
  const overdue = isOverdue(data.status, data.dueAt);

  return (
    <div className="flex flex-col gap-6">
      {/*
        CHOP ETISHDA FAQAT HUJJATNING O'ZI CHIQADI.

        Menyu, tugmalar va ichki izoh qog'ozda keraksiz — va
        ichki izoh DILERGA KO'RSATILMAYDI, ya'ni u chop etilgan
        varaqqa tushib qolmasligi ham kerak.
      */}
      <style>{`
        @media print {
          body { background: #fff; }
          aside, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      <div className="no-print">
        <Link href="/finance/invoices" className="text-sm underline-offset-4 hover:underline">
          ← Hisob-fakturalar
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display-3 tabular-nums">{data.number}</h1>
            <Badge tone={invoiceStatusTone(data.status)}>{invoiceStatusLabel(data.status)}</Badge>
            {overdue && <Badge tone="danger">Muddati o‘tgan</Badge>}
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {data.dealer?.companyName ?? '—'}
            {data.order !== null && ` · buyurtma ${data.order.number}`}
          </p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          {data.status === 'DRAFT' && (
            <Button disabled={issue.isPending} onClick={() => issue.mutate()}>
              Berish
            </Button>
          )}

          {(data.status === 'DRAFT' ||
            data.status === 'ISSUED' ||
            data.status === 'PARTIALLY_PAID') && (
            <Button variant="ghost" onClick={() => setCancelling(true)}>
              Bekor qilish
            </Button>
          )}

          <Button variant="secondary" onClick={() => window.print()}>
            Chop etish
          </Button>
        </div>
      </div>

      {error !== null && (
        <p role="alert" className="no-print text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {data.status === 'DRAFT' && (
        <GlassCard className="no-print p-4">
          <p className="text-sm text-[var(--color-fg-muted)]">
            <strong>Bu hujjat hali BERILMAGAN.</strong> Diler uni ko‘rmaydi. Berilgandan keyin
            summalar muzlaydi — tuzatish yo‘li bitta: bekor qilish va yangisini berish.
          </p>
        </GlassCard>
      )}

      {data.cancelReason !== null && (
        <GlassCard className="p-4">
          <p className="text-sm">
            <strong>Bekor qilindi:</strong> {data.cancelReason}
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Berildi"
            value={data.issuedAt === null ? '—' : formatDateTime(data.issuedAt)}
          />
          <Field label="Muddat" value={data.dueAt === null ? '—' : formatDateTime(data.dueAt)} />
          <Field label="Hudud" value={data.dealer?.region ?? '—'} />
        </div>

        <table className="mt-6 w-full text-sm">
          <caption className="sr-only">Hisob-faktura pozitsiyalari</caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <th scope="col" className="pb-2 font-medium">
                Mahsulot
              </th>
              <th scope="col" className="pb-2 font-medium">
                SKU
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Soni
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Narx
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Jami
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-line)]">
                <td className="py-2.5">
                  {productName(item.productName)}
                  {item.volumeMl !== null && (
                    <span className="block text-xs text-[var(--color-fg-subtle)]">
                      {item.volumeMl} ml
                    </span>
                  )}
                </td>
                <td className="py-2.5 tabular-nums">{item.sku}</td>
                <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatMinor(item.unitPrice, data.currency)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatMinor(item.total, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
          <Total label="Oraliq jami" value={formatMinor(data.subtotal, data.currency)} />
          {data.discount > 0 && (
            <Total label="Chegirma" value={`−${formatMinor(data.discount, data.currency)}`} />
          )}
          {/*
            SOLIQ QATORI KO'RSATILADI VA U NOL.

            Yashirib qo'yish "soliq hisobga olingan" degan taassurot
            berardi. Stavka BARFF dan kelmagan (Q17).
          */}
          <Total
            label="Soliq (QQS kutilmoqda)"
            value={formatMinor(data.taxAmount, data.currency)}
          />
          <div className="mt-1 border-t border-[var(--color-line)] pt-2">
            <Total label="To‘lanishi kerak" value={formatMinor(data.total, data.currency)} strong />
          </div>
          <Total label="To‘langan" value={formatMinor(data.allocated, data.currency)} />
          <Total label="Qolgan" value={formatMinor(data.outstanding, data.currency)} strong />
        </dl>

        <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
          Bu ko‘rinish RASMIY soliq hujjati emas. Rasmiy shakl va QQS qoidalari BARFF dan kelgandan
          keyin qo‘shiladi.
        </p>
      </GlassCard>

      <GlassCard className="no-print p-5">
        <h2 className="text-lg font-semibold">To‘lovlar</h2>

        {data.allocations.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-fg-subtle)]">Taqsimlangan to‘lov yo‘q.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
            {data.allocations.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="tabular-nums">{row.payment.number}</span>
                <span className="text-[var(--color-fg-muted)]">
                  {paymentMethodLabel(row.payment.method)}
                  {row.payment.reference !== null && ` · ${row.payment.reference}`}
                </span>
                <span className="ml-auto tabular-nums">
                  {formatMinor(row.amount, data.currency)}
                </span>
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  {formatDateTime(row.payment.receivedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {data.internalNote !== null && data.internalNote !== '' && (
        <GlassCard className="no-print p-5">
          <h2 className="text-lg font-semibold">Ichki izoh</h2>
          <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
            Bu matn DILERGA ko‘rsatilmaydi.
          </p>
          <p className="mt-2 text-sm">{data.internalNote}</p>
        </GlassCard>
      )}

      {cancelling && (
        <CancelDialog
          pending={cancel.isPending}
          hasAllocations={data.allocations.length > 0}
          onClose={() => {
            setCancelling(false);
            setError(null);
          }}
          onSubmit={(reason) => cancel.mutate(reason)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong === true ? 'font-medium' : 'text-[var(--color-fg-muted)]'}>{label}</dt>
      <dd className={`tabular-nums ${strong === true ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}

function CancelDialog({
  pending,
  hasAllocations,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  hasAllocations: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Hisob-fakturani bekor qilish"
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || hasAllocations || reason.trim().length < 3}
            onClick={() => onSubmit(reason.trim())}
          >
            Tasdiqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {hasAllocations ? (
          /*
            TAQSIMLANGAN TO'LOVI BOR HUJJAT BEKOR QILINMAYDI.

            Aks holda pul "hech qaysi hisob-fakturaga tegishli
            emas" holatga tushib qolardi. Server buni rad etadi;
            bu yerda SABAB oldindan aytiladi, shunda
            foydalanuvchi forma to'ldirib bekorga urinmaydi.
          */
          <p className="text-sm text-[var(--color-danger)]">
            Bu hujjatga to‘lov taqsimlangan. Avval «To‘lovlar» bo‘limida taqsimotni boshqa hujjatga
            o‘tkazing, keyin bekor qiling.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Bekor qilingan hujjat balansdan CHIQADI. Tuzatish uchun yangisini berasiz.
            </p>

            <Textarea
              label="Sabab"
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              hint="Kamida 3 belgi. Bu matn dilerga ham ko‘rsatiladi."
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
