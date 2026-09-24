'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, GlassCard } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError } from '@/lib/api-client';
import { CART_KEY, ORDERS_KEY, addToCart, cancelOrder, getOrder } from '@/lib/cart-api';
import { formatMoney } from '@/lib/money';
import { formatDate, statusLabel, statusTone } from '@/lib/order-labels';

/**
 * Buyurtma tafsiloti: pozitsiyalar, manzil va HOLAT VAQT CHIZIG'I.
 *
 * Vaqt chizig'i `order_status_history` dan keladi — ya'ni "buyurtmam
 * qayerda?" degan savolga javob dilerning O'ZIDA bo'ladi va u
 * qo'ng'iroq qilishga majbur emas.
 *
 * TAKROR BUYURTMA: pozitsiyalar savatga qayta qo'shiladi. Narx
 * QAYTA HISOBLANADI — eski narx tiklanmaydi, chunki u o'sha
 * lahzaning narxi edi.
 */
export function OrderDetailView({ id, justCreated }: { id: string; justCreated: boolean }) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [repeated, setRepeated] = useState(false);

  const order = useQuery({ queryKey: [...ORDERS_KEY, id], queryFn: () => getOrder(id) });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: async () => {
      setError(null);
      await client.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Bekor qilib bo‘lmadi.'),
  });

  const repeat = useMutation({
    mutationFn: async () => {
      const data = order.data;
      /* c8 ignore next */
      if (data === undefined) return;

      // Ketma-ket: server har qo'shishda savatni qayta hisoblaydi.
      for (const item of data.items) {
        await addToCart(item.variantId, item.quantity);
      }
    },
    onSuccess: async () => {
      setError(null);
      setRepeated(true);
      await client.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: (err) =>
      setError(
        err instanceof ApiRequestError ? err.message : 'Pozitsiyalarni savatga qo‘shib bo‘lmadi.',
      ),
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
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
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
  const cancellable = data.status === 'PENDING_REVIEW' || data.status === 'DRAFT';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {justCreated && (
        <GlassCard className="border-[var(--color-success)] p-4">
          <p role="status" className="text-sm">
            Buyurtmangiz qabul qilindi. Ko‘rib chiqilgandan so‘ng holat o‘zgaradi.
          </p>
        </GlassCard>
      )}

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

        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{formatDate(data.createdAt)}</p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

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
                <p className="font-medium">{item.productName?.uz ?? item.sku}</p>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {item.volumeMl} ml · {item.quantity} dona
                </p>
                {item.appliedRuleName !== null && (
                  <p className="text-xs text-[var(--color-accent-text)]">{item.appliedRuleName}</p>
                )}
              </div>

              <div className="text-right tabular-nums">
                <p className="font-semibold">{formatMoney(item.total, data.currency)}</p>
                <p className="text-xs text-[var(--color-fg-subtle)]">
                  {formatMoney(item.unitPrice, data.currency)} × {item.quantity}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {data.discount > 0 && (
          <div className="flex justify-between border-t border-[var(--color-line)] pt-3 text-sm">
            <span className="text-[var(--color-fg-muted)]">Chegirma</span>
            <span className="tabular-nums text-[var(--color-accent-text)]">
              −{formatMoney(data.discount, data.currency)}
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
          <span className="text-sm text-[var(--color-fg-muted)]">Jami</span>
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(data.total, data.currency)}
          </span>
        </div>
      </GlassCard>

      {/* --- MANZIL --- */}
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
            <span className="text-[var(--color-fg-muted)]">Izoh: </span>
            {data.note}
          </p>
        )}
      </GlassCard>

      {/* --- VAQT CHIZIG'I --- */}
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
                <p className="font-medium">{statusLabel(event.toStatus)}</p>
                <p className="text-sm text-[var(--color-fg-subtle)]">
                  {formatDate(event.createdAt)}
                </p>
                {event.note !== null && (
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{event.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </GlassCard>

      {/* --- AMALLAR --- */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => repeat.mutate()} disabled={repeat.isPending}>
          {repeated ? 'Savatga qo‘shildi' : 'Takroriy buyurtma'}
        </Button>

        {repeated && (
          <Button asChild variant="secondary">
            <Link href="/cart">Savatga o‘tish</Link>
          </Button>
        )}

        {cancellable && (
          <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Bekor qilish
          </Button>
        )}
      </div>

      <p className="text-sm text-[var(--color-fg-subtle)]">
        Takroriy buyurtmada narx QAYTA hisoblanadi — u o‘zgargan bo‘lishi mumkin.
      </p>
    </div>
  );
}
