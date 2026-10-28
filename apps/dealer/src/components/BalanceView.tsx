'use client';

import { useQuery } from '@tanstack/react-query';
import { type Paginated } from '@barff/types';
import { GlassCard, Skeleton } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { formatMoney } from '@/lib/money';

interface Balance {
  invoiced: number;
  paid: number;
  outstanding: number;
  unallocated: number;
  dealer: { id: string; companyName: string; creditLimit: number | null } | null;
}

interface PaymentRow {
  id: string;
  number: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  receivedAt: string;
  allocations: { amount: number; invoice: { number: string } }[];
}

const METHODS: Record<string, string> = {
  CASH: 'Naqd',
  BANK_TRANSFER: 'Bank o‘tkazmasi',
  CARD: 'Karta',
  OFFSET: 'O‘zaro hisob',
  OTHER: 'Boshqa',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Balans va to'lovlar (CLAUDE.md §5).
 *
 * BALANS AYIRMA: berilgan hisob-fakturalar minus kelgan to'lovlar
 * (`docs/BILLING-POLICY.md` §2). Saqlangan raqam emas, shuning
 * uchun u hech qachon hujjatlar ro'yxatidan ajralib ketmaydi.
 *
 * MANFIY QARZ — XATO EMAS: diler qarzidan ko'p to'lagan bo'lsa,
 * ortiqcha summa uning foydasiga turadi. Shuning uchun yorliq
 * ham almashadi.
 */
export function BalanceView() {
  const balance = useQuery({
    queryKey: ['dealer-balance'],
    queryFn: () => apiFetch<Balance>('/dealer/balance'),
  });

  const payments = useQuery({
    queryKey: ['dealer-payments'],
    queryFn: () => apiFetch<Paginated<PaymentRow>>('/dealer/payments?limit=20'),
  });

  if (balance.isPending) return <Skeleton className="h-40" />;

  if (balance.isError || balance.data === undefined) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Balansni yuklab bo‘lmadi.
      </p>
    );
  }

  const data = balance.data;
  const owes = data.outstanding > 0;

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-6">
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {owes ? 'Joriy qarz' : data.outstanding < 0 ? 'Oldindan to‘lov' : 'Qarz yo‘q'}
        </p>
        <p className="display-3 mt-1 tabular-nums">{formatMoney(Math.abs(data.outstanding))}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Berilgan hisob-fakturalar" value={formatMoney(data.invoiced)} />
          <Stat label="To‘langan" value={formatMoney(data.paid)} />
          <Stat
            label="Kredit limiti"
            value={
              data.dealer?.creditLimit == null
                ? 'belgilanmagan'
                : formatMoney(data.dealer.creditLimit)
            }
          />
        </div>
      </GlassCard>

      <div>
        <h2 className="text-lg font-semibold">To‘lovlar tarixi</h2>

        {payments.isPending ? (
          <Skeleton className="mt-3 h-24" />
        ) : (payments.data?.items ?? []).length === 0 ? (
          <GlassCard className="mt-3 p-5">
            <p className="text-sm text-[var(--color-fg-muted)]">Hozircha to‘lov yo‘q.</p>
          </GlassCard>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {(payments.data?.items ?? []).map((row) => (
              <li key={row.id}>
                <GlassCard className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="tabular-nums">{row.number}</span>
                  <span className="text-[var(--color-fg-muted)]">
                    {METHODS[row.method] ?? row.method}
                    {row.reference !== null && ` · ${row.reference}`}
                  </span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatMoney(row.amount, row.currency)}
                  </span>
                  <span className="w-full text-xs text-[var(--color-fg-subtle)]">
                    {formatDate(row.receivedAt)}
                    {row.allocations.length > 0 &&
                      ` · ${row.allocations.map((a) => a.invoice.number).join(', ')}`}
                  </span>
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-fg-subtle)]">{label}</p>
      <p className="mt-0.5 text-sm tabular-nums">{value}</p>
    </div>
  );
}
