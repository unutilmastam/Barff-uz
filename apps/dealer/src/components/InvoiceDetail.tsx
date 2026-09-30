'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, GlassCard, Skeleton } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/money';

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
  order: { number: string } | null;
  items: {
    id: string;
    sku: string;
    productName: Localized | string;
    volumeMl: number | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  allocations: { id: string; amount: number; payment: { number: string; receivedAt: string } }[];
}

const LABELS: Record<string, string> = {
  ISSUED: 'To‘lanmagan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
  CANCELLED: 'Bekor qilingan',
};

function name(value: Localized | string): string {
  if (typeof value === 'string') return value;

  return value.uz ?? value.ru ?? value.en ?? '—';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Hisob-faktura — diler ko'rinishi.
 *
 * ICHKI IZOH BU YERDA YO'Q va u serverdan ham kelmasligi kerak
 * emas: u hujjatning bir qismi emas, xodimlar uchun yozuv
 * (`docs/BILLING-POLICY.md` §7). Shuning uchun bu komponent uni
 * UMUMAN o'qimaydi.
 *
 * Chop etish — brauzerning o'z buyrug'i bilan; PDF generatori
 * qo'shilmagan (Q17: rasmiy shakl hali yo'q).
 */
export function InvoiceDetail({ id }: { id: string }) {
  const invoice = useQuery({
    queryKey: ['dealer-invoice', id],
    queryFn: () => apiFetch<Invoice>(`/dealer/invoices/${id}`),
  });

  if (invoice.isPending) return <Skeleton className="h-64" />;

  if (invoice.isError || invoice.data === undefined) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Hisob-fakturani yuklab bo‘lmadi.
      </p>
    );
  }

  const data = invoice.data;

  return (
    <div className="flex flex-col gap-5">
      <style>{`
        @media print {
          body { background: #fff; }
          aside, header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      <div className="no-print">
        <Link href="/invoices" className="text-sm underline-offset-4 hover:underline">
          ← Hisob-fakturalar
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display-3 tabular-nums">{data.number}</h1>
            <Badge tone={data.status === 'PAID' ? 'success' : 'brand'}>
              {LABELS[data.status] ?? data.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {data.order !== null && `Buyurtma ${data.order.number} · `}
            {data.issuedAt !== null && `berilgan ${formatDate(data.issuedAt)}`}
            {data.dueAt !== null && ` · muddat ${formatDate(data.dueAt)}`}
          </p>
        </div>

        <Button className="no-print" variant="secondary" onClick={() => window.print()}>
          Chop etish
        </Button>
      </div>

      {data.cancelReason !== null && (
        <GlassCard className="p-4">
          <p className="text-sm">
            <strong>Bekor qilindi:</strong> {data.cancelReason}
          </p>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <table className="w-full text-sm">
          <caption className="sr-only">Hisob-faktura pozitsiyalari</caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <th scope="col" className="pb-2 font-medium">
                Mahsulot
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
                  {name(item.productName)}
                  <span className="block text-xs text-[var(--color-fg-subtle)]">
                    {item.sku}
                    {item.volumeMl !== null && ` · ${item.volumeMl} ml`}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatMoney(item.unitPrice, data.currency)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatMoney(item.total, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
          <Row label="Oraliq jami" value={formatMoney(data.subtotal, data.currency)} />
          {data.discount > 0 && (
            <Row label="Chegirma" value={`−${formatMoney(data.discount, data.currency)}`} />
          )}
          <div className="mt-1 border-t border-[var(--color-line)] pt-2">
            <Row label="To‘lanishi kerak" value={formatMoney(data.total, data.currency)} strong />
          </div>
          <Row label="To‘langan" value={formatMoney(data.allocated, data.currency)} />
          <Row label="Qolgan" value={formatMoney(data.outstanding, data.currency)} strong />
        </dl>
      </GlassCard>

      {data.allocations.length > 0 && (
        <GlassCard className="p-5">
          <h2 className="text-lg font-semibold">To‘lovlar</h2>
          <ul className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
            {data.allocations.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="tabular-nums">{row.payment.number}</span>
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  {formatDate(row.payment.receivedAt)}
                </span>
                <span className="ml-auto tabular-nums">
                  {formatMoney(row.amount, data.currency)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong === true ? 'font-medium' : 'text-[var(--color-fg-muted)]'}>{label}</dt>
      <dd className={`tabular-nums ${strong === true ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}
