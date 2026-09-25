'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { type Localized } from '@barff/types';
import { Badge, Button, GlassCard, Textarea } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { formatDateTime, nextStatuses, statusLabel, statusTone } from '@/lib/order-labels';

interface OrderItem {
  id: string;
  sku: string;
  productName: Localized;
  volumeMl: number;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  total: number;
  appliedRuleName: string | null;
}

interface OrderEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; fullName: string } | null;
}

interface OrderDetail {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  promoCode: string | null;
  note: string | null;
  internalNote: string | null;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  shippingNotes: string | null;
  createdAt: string;
  /*
    Tiplar ATAYLAB yumshoq: server javobi kutilganidan kam maydon
    bilan kelishi mumkin (eski versiya, qisman xato). Panel bundan
    YIQILMASLIGI kerak.
  */
  dealer: {
    id: string;
    companyName: string;
    region?: string;
    taxId?: string | null;
    status?: string;
    tier?: { code: string; name: string; discountBasisPoints: number } | null;
    user?: { fullName?: string; email?: string; phone?: string | null };
  } | null;
  items: OrderItem[];
  history: OrderEvent[];
}

function money(tiyin: number, currency: string): string {
  const whole = Math.round(tiyin / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${whole} ${currency === 'UZS' ? "so'm" : currency}`;
}

const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

/**
 * Buyurtma tafsiloti (CLAUDE.md §8).
 *
 * HOLAT TUGMALARI `@barff/types` dagi YAGONA o'tish jadvalidan
 * quriladi — server ham o'shani ishlatadi. Shuning uchun panel
 * ko'rsatgan tugmani server rad etmaydi.
 *
 * DIQQAT: bu KOSMETIKA. Ruxsat etilmagan o'tishni to'g'ridan-to'g'ri
 * `fetch` bilan ham bajarib bo'lmaydi — server `409` qaytaradi va
 * bu test bilan qoplangan (S26).
 */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const order = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => apiFetch<OrderDetail>(`/admin/orders/${id}`),
  });

  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ['admin-order', id] });
    await client.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Holatni o‘zgartirib bo‘lmadi.'),
  });

  const saveNote = useMutation({
    mutationFn: (value: string) =>
      apiFetch(`/admin/orders/${id}/internal-note`, {
        method: 'PUT',
        body: { internalNote: value },
      }),
    onSuccess: async () => {
      setError(null);
      setNote(null);
      await invalidate();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Izohni saqlab bo‘lmadi.'),
  });

  if (order.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (order.isError || order.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Buyurtma topilmadi.
        </p>
        <Button asChild variant="secondary">
          <Link href="/orders">Buyurtmalarga qaytish</Link>
        </Button>
      </div>
    );
  }

  const data = order.data;
  const transitions = nextStatuses(data.status);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/orders"
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:underline"
        >
          ← Buyurtmalar
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="display-3 tabular-nums">{data.number}</h1>
          <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
        </div>

        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {formatDateTime(data.createdAt)}
        </p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {/* --- HOLATNI O'ZGARTIRISH --- */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <h2 className="display-4">Holatni o‘zgartirish</h2>

        {transitions.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Bu yakuniy holat — o‘zgartirish mumkin emas.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <Button
                key={status}
                variant={status === 'CANCELLED' ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => setStatus.mutate(status)}
                disabled={setStatus.isPending}
              >
                {statusLabel(status)}
              </Button>
            ))}
          </div>
        )}
      </GlassCard>

      {/*
        --- DILER ---

        HAR BIR maydon ixtiyoriy zanjir bilan o'qiladi. Sabab o'lchab
        topilgan: bir marta `data.dealer?.user.fullName` yozilgan edi
        va `user` kelmaganda butun panel OQ EKRANGA aylandi
        ("Application error: a client-side exception"). O'sha holatda
        sabab eski server edi, lekin natija bir xil: bitta maydon
        yetishmagani uchun xodim HECH NARSA ko'rmaydi.

        Bo'sh maydon uchun "—" ko'rsatish har doim oq ekrandan
        yaxshiroq.
      */}
      <GlassCard className="flex flex-col gap-2 p-5">
        <h2 className="display-4">Diler</h2>
        <p className="mt-1 font-medium">{data.dealer?.companyName ?? '—'}</p>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {[
            data.dealer?.user?.fullName,
            data.dealer?.user?.email,
            data.dealer?.user?.phone !== null && data.dealer?.user?.phone !== undefined
              ? formatPhone(data.dealer.user.phone)
              : null,
          ]
            .filter((part) => part !== null && part !== undefined && part !== '')
            .join(' · ') || '—'}
        </p>
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {[
            `Hudud: ${data.dealer?.region ?? '—'}`,
            data.dealer?.taxId != null ? `STIR: ${data.dealer.taxId}` : null,
            data.dealer?.tier != null ? `Daraja: ${data.dealer.tier.name}` : null,
          ]
            .filter((part) => part !== null)
            .join(' · ')}
        </p>
      </GlassCard>

      {/* --- POZITSIYALAR --- */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <h2 className="display-4">Pozitsiyalar</h2>

        <ul className="flex flex-col gap-3">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap justify-between gap-2 border-t border-[var(--color-line)] pt-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{text(item.productName, item.sku)}</p>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {item.sku} · {item.volumeMl} ml · {item.quantity} dona
                </p>
                {item.appliedRuleName !== null && (
                  <p className="text-xs text-[var(--color-accent-text)]">{item.appliedRuleName}</p>
                )}
              </div>

              <div className="text-right tabular-nums">
                <p className="font-semibold">{money(item.total, data.currency)}</p>
                <p className="text-xs text-[var(--color-fg-subtle)]">
                  {money(item.unitPrice, data.currency)} × {item.quantity}
                  {item.basePrice !== item.unitPrice && (
                    <span className="ml-1 line-through">
                      {money(item.basePrice, data.currency)}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
          <span className="text-sm text-[var(--color-fg-muted)]">Jami</span>
          <span className="text-2xl font-semibold tabular-nums">
            {money(data.total, data.currency)}
          </span>
        </div>
      </GlassCard>

      {/* --- YETKAZIB BERISH --- */}
      <GlassCard className="flex flex-col gap-2 p-5">
        <h2 className="display-4">Yetkazib berish</h2>
        <p className="mt-1 font-medium">{data.shippingLabel}</p>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {data.shippingRegion}, {data.shippingAddress}
        </p>
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {data.contactName} · {formatPhone(data.contactPhone)}
        </p>
        {data.shippingNotes !== null && (
          <p className="text-sm text-[var(--color-fg-subtle)]">{data.shippingNotes}</p>
        )}
        {data.note !== null && (
          <p className="mt-2 border-t border-[var(--color-line)] pt-2 text-sm">
            <span className="text-[var(--color-fg-muted)]">Diler izohi: </span>
            {data.note}
          </p>
        )}
      </GlassCard>

      {/* --- ICHKI IZOH --- */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <h2 className="display-4">Ichki izoh</h2>
        <p className="text-sm text-[var(--color-fg-subtle)]">Bu matn DILERGA ko‘rsatilmaydi.</p>

        <Textarea
          label="Izoh"
          rows={3}
          value={note ?? data.internalNote ?? ''}
          onChange={(event) => setNote(event.target.value)}
        />

        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => saveNote.mutate(note ?? '')}
            disabled={saveNote.isPending || note === null}
          >
            Saqlash
          </Button>
        </div>
      </GlassCard>

      {/* --- TARIX --- */}
      <GlassCard className="flex flex-col gap-3 p-5">
        <h2 className="display-4">Holat tarixi</h2>

        <ol className="flex flex-col gap-3">
          {data.history.map((event) => (
            <li key={event.id} className="flex gap-3 border-t border-[var(--color-line)] pt-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--color-accent)]"
              />
              <div className="min-w-0">
                <p className="font-medium">
                  {event.fromStatus !== null && (
                    <span className="text-[var(--color-fg-subtle)]">
                      {statusLabel(event.fromStatus)} →{' '}
                    </span>
                  )}
                  {statusLabel(event.toStatus)}
                </p>
                <p className="text-sm text-[var(--color-fg-subtle)]">
                  {formatDateTime(event.createdAt)}
                  {event.actor !== null && ` · ${event.actor.fullName}`}
                </p>
                {event.note !== null && (
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{event.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </GlassCard>
    </div>
  );
}
