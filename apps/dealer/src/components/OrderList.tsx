'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Button, GlassCard } from '@barff/ui';
import { ORDERS_KEY, getOrders } from '@/lib/cart-api';
import { formatMoney } from '@/lib/money';
import { formatDate, statusLabel, statusTone } from '@/lib/order-labels';

/**
 * Buyurtmalar ro'yxati.
 *
 * Kartochka ko'rinishida, jadval emas: telefonda jadval gorizontal
 * skrollga majbur qiladi va diler ustunlarni ko'ra olmaydi.
 */
export function OrderList() {
  const orders = useQuery({ queryKey: ORDERS_KEY, queryFn: () => getOrders() });

  if (orders.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (orders.isError) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Buyurtmalarni yuklab bo‘lmadi. Sahifani biroz keyinroq yangilang.
      </p>
    );
  }

  const items = orders.data?.items ?? [];

  if (items.length === 0) {
    return (
      <GlassCard className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-[var(--color-fg-muted)]">Hozircha buyurtma yo‘q.</p>
        <Button asChild>
          <Link href="/catalog">Katalogga o‘tish</Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((order) => (
        <GlassCard as="li" key={order.id} className="group relative p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-medium tabular-nums">
                <Link
                  href={`/orders/${order.id}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {order.number}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                {formatDate(order.createdAt)}
                {order._count !== undefined && ` · ${order._count.items} pozitsiya`}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
              <p className="font-semibold tabular-nums">
                {formatMoney(order.total, order.currency)}
              </p>
            </div>
          </div>
        </GlassCard>
      ))}
    </ul>
  );
}
