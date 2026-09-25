'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { type Localized } from '@barff/types';
import { Badge, Button, GlassCard } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { formatDateTime, nextStatuses, statusLabel, statusTone } from '@/lib/order-labels';

interface PickingLine {
  id: string;
  quantity: number;
  status: string;
  warehouse: { id: string; code: string; name: string };
  productVariant: { id: string; sku: string; volumeMl: number };
  orderItem: { id: string; sku: string; productName: Localized; quantity: number };
}

interface PickingList {
  order: {
    id: string;
    number: string;
    status: string;
    shippingLabel: string;
    shippingRegion: string;
    createdAt: string;
    dealer: { id: string; companyName: string } | null;
  };
  lines: PickingLine[];
}

const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

/**
 * Yig'ish varaqasi (CLAUDE.md §7).
 *
 * Belgilash MIJOZDA qoladi va SAQLANMAYDI — bu ataylab: bu
 * omborchining o'zi uchun belgi, biznes yozuvi emas. Haqiqiy
 * hodisa — QADOQLASH tugmasi, u buyurtmani `PACKED` ga o'tkazadi
 * va tovar o'sha paytda ombordan chiqadi
 * (`docs/WAREHOUSE-POLICY.md` §3).
 */
export default function PickingListPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const client = useQueryClient();

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['picking-list', orderId],
    queryFn: () => apiFetch<PickingList>(`/warehouse/picking/${orderId}`),
  });

  const advance = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: async () => {
      setError(null);
      await client.invalidateQueries({ queryKey: ['picking-list', orderId] });
      await client.invalidateQueries({ queryKey: ['picking-queue'] });
      await client.invalidateQueries({ queryKey: ['warehouse-stock'] });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Holatni o‘zgartirib bo‘lmadi.'),
  });

  if (list.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (list.isError || list.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Yig‘ish varaqasi topilmadi.
        </p>
        <Button asChild variant="secondary">
          <Link href="/warehouse/picking">Navbatga qaytish</Link>
        </Button>
      </div>
    );
  }

  const { order, lines } = list.data;
  const transitions = nextStatuses(order.status).filter((status) => status !== 'CANCELLED');
  const allPicked = lines.length > 0 && lines.every((line) => picked.has(line.id));

  const toggle = (id: string) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/warehouse/picking"
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:underline"
        >
          ← Yig‘ish navbati
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="display-3 tabular-nums">{order.number}</h1>
          <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
        </div>

        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {order.dealer?.companyName ?? '—'} · {order.shippingRegion} ·{' '}
          {formatDateTime(order.createdAt)}
        </p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <GlassCard className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display-4">Yig‘iladigan pozitsiyalar</h2>
          <span className="text-sm tabular-nums text-[var(--color-fg-muted)]">
            {picked.size} / {lines.length}
          </span>
        </div>

        <p className="text-sm text-[var(--color-fg-subtle)]">
          Belgilash faqat o‘zingiz uchun — u saqlanmaydi. Haqiqiy hodisa quyidagi tugma.
        </p>

        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-line)] p-3">
                <input
                  type="checkbox"
                  checked={picked.has(line.id)}
                  onChange={() => toggle(line.id)}
                  className="size-5"
                />

                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {text(line.orderItem.productName, line.productVariant.sku)}
                  </span>
                  <span className="block text-sm text-[var(--color-fg-muted)]">
                    {line.productVariant.sku} · {line.productVariant.volumeMl} ml ·{' '}
                    {line.warehouse.code}
                  </span>
                </span>

                <span className="shrink-0 text-lg font-semibold tabular-nums">{line.quantity}</span>
              </label>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-5">
        <h2 className="display-4">Keyingi qadam</h2>

        {transitions.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Bu buyurtma ombordan chiqib bo‘ldi.
          </p>
        ) : (
          <>
            {order.status === 'PICKING' && !allPicked && (
              <p className="text-sm text-[var(--color-warning)]">
                Hamma pozitsiya belgilanmagan. Qadoqlashda tovar ombordan CHIQADI.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {transitions.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  onClick={() => advance.mutate(status)}
                  disabled={advance.isPending}
                >
                  {statusLabel(status)}
                </Button>
              ))}
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}
