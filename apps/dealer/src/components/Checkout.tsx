'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button, GlassCard, Input } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError } from '@/lib/api-client';
import { CART_KEY, type Cart, ORDERS_KEY, getAddresses, submitOrder } from '@/lib/cart-api';
import { formatMoney } from '@/lib/money';

/**
 * Rasmiylashtirish: MANZIL -> KO'RIB CHIQISH -> YUBORISH.
 *
 * Oqim `CLAUDE.md` §5 dagi ketma-ketlikning oxirgi uchta qadami.
 * Savat sahifasining O'ZIDA qoladi — alohida sahifaga o'tkazish
 * telefonda ortiqcha yuklash va "orqaga" bosilganda savat
 * yo'qolishi xavfini qo'shardi.
 *
 * HAR BIR QADAMDA XATODAN CHIQISH YO'LI BOR (`ROADMAP.md` S27 DoD):
 * manzil yo'q bo'lsa — manzil qo'shish havolasi; yuborish xato
 * bersa — xabar va QAYTA urinish (kalit o'sha-o'shaligicha qoladi).
 */
export function Checkout({ cart }: { cart: Cart }) {
  const router = useRouter();
  const client = useQueryClient();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = useQuery({ queryKey: ['dealer-addresses'], queryFn: getAddresses });

  /*
    KALIT BIR MARTA yaratiladi — komponent birinchi chizilganda.

    Yuborish tugmasi bosilganda yaratilsa, ikki bosish ikki xil kalit
    berardi va takrorga qarshi himoya UMUMAN ishlamasdi. `useMemo`
    bo'sh bog'liqlik bilan aynan shuni kafolatlaydi.
  */
  const idempotencyKey = useMemo(
    () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    [],
  );

  const selected =
    addresses.data?.find((address) => address.id === addressId) ??
    addresses.data?.find((address) => address.isDefault) ??
    addresses.data?.[0] ??
    null;

  const submit = useMutation({
    mutationFn: () =>
      submitOrder({
        addressId: selected?.id ?? '',
        ...(note.trim() !== '' ? { note: note.trim() } : {}),
        idempotencyKey,
      }),
    onSuccess: async (order) => {
      setError(null);
      // Savat serverda bo'shatilgan — keshni ham yangilaymiz.
      await client.invalidateQueries({ queryKey: CART_KEY });
      await client.invalidateQueries({ queryKey: ORDERS_KEY });
      router.push(`/orders/${order.id}?yangi=1`);
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Buyurtmani yuborib bo‘lmadi.'),
  });

  if (addresses.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Manzillar yuklanmoqda…
      </p>
    );
  }

  /* XATODAN CHIQISH: manzil yo'q bo'lsa nima qilish kerakligi aytiladi. */
  if (addresses.isError || (addresses.data ?? []).length === 0) {
    return (
      <GlassCard className="flex flex-col items-start gap-3 p-5">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Buyurtma berish uchun yetkazib berish manzili kerak.
        </p>
        <Button asChild variant="secondary">
          <Link href="/addresses">Manzil qo‘shish</Link>
        </Button>
      </GlassCard>
    );
  }

  if (!reviewing) {
    return (
      <GlassCard className="flex flex-col gap-4 p-5">
        <h2 className="display-4">Yetkazib berish manzili</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Manzilni tanlang</legend>

          {(addresses.data ?? []).map((address) => (
            <label
              key={address.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-line)] p-3"
            >
              <input
                type="radio"
                name="address"
                value={address.id}
                checked={selected?.id === address.id}
                onChange={() => setAddressId(address.id)}
                className="mt-1"
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{address.label}</span>
                  {address.isDefault && <Badge tone="brand">Standart</Badge>}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-fg-muted)]">
                  {[address.region, address.district, address.city, address.street]
                    .filter((part) => part !== null && part !== '')
                    .join(', ')}
                </span>
                <span className="mt-1 block text-sm text-[var(--color-fg-subtle)]">
                  {address.contactName} · {formatPhone(address.contactPhone)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <Input
          label="Izoh (ixtiyoriy)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <Button onClick={() => setReviewing(true)} disabled={selected === null || cart.hasIssues}>
          Ko‘rib chiqish
        </Button>

        {cart.hasIssues && (
          <p className="text-sm text-[var(--color-warning)]">
            Avval eng kam buyurtma miqdorini to‘ldiring.
          </p>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <h2 className="display-4">Buyurtmani tasdiqlang</h2>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1 border-t border-[var(--color-line)] pt-4">
        <p className="text-sm text-[var(--color-fg-muted)]">Manzil</p>
        <p className="font-medium">{selected?.label}</p>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {[selected?.region, selected?.district, selected?.city, selected?.street]
            .filter((part) => part !== null && part !== undefined && part !== '')
            .join(', ')}
        </p>
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {selected?.contactName} · {formatPhone(selected?.contactPhone ?? '')}
        </p>
      </div>

      <ul className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-4">
        {cart.lines.map((line) => (
          <li key={line.itemId} className="flex justify-between gap-3 text-sm">
            <span className="min-w-0">
              {line.productName?.uz ?? line.sku}
              <span className="text-[var(--color-fg-subtle)]"> × {line.quantity}</span>
            </span>
            <span className="shrink-0 tabular-nums">{formatMoney(line.total, line.currency)}</span>
          </li>
        ))}
      </ul>

      {note.trim() !== '' && (
        <div className="border-t border-[var(--color-line)] pt-4">
          <p className="text-sm text-[var(--color-fg-muted)]">Izoh</p>
          <p className="text-sm">{note}</p>
        </div>
      )}

      <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-4">
        <p className="text-sm text-[var(--color-fg-muted)]">To‘lanadi</p>
        <p className="text-2xl font-semibold tabular-nums">
          {formatMoney(cart.total, cart.currency)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="sm:flex-1">
          {submit.isPending ? 'Yuborilmoqda…' : 'Buyurtmani yuborish'}
        </Button>

        {/*
          ORQAGA — xatodan chiqish yo'li. Manzil noto'g'ri tanlangan
          bo'lsa diler savatni qaytadan yig'ishga majbur bo'lmasligi
          kerak.
        */}
        <Button variant="ghost" onClick={() => setReviewing(false)} disabled={submit.isPending}>
          Orqaga
        </Button>
      </div>
    </GlassCard>
  );
}
