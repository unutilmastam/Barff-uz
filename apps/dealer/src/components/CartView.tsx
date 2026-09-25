'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Localized } from '@barff/types';
import { Badge, Button, GlassCard, Input, MediaFrame } from '@barff/ui';
import { ApiImage } from '@/components/ApiImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { Checkout } from '@/components/Checkout';
import { ApiRequestError } from '@/lib/api-client';
import {
  CART_KEY,
  type Cart,
  clearCart,
  getCart,
  removeCartItem,
  setCartQuantity,
  setPromoCode,
} from '@/lib/cart-api';
import { formatMoney, formatPercent } from '@/lib/money';

const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

/**
 * Savat.
 *
 * HAR BIR AMAL yangilangan savatni QAYTARADI va u to'g'ridan-to'g'ri
 * keshga yoziladi. Shuning uchun miqdor o'zgarganda narx SERVERDAN
 * kelgan qiymat bilan yangilanadi — mijozda hech narsa hisoblanmaydi.
 *
 * Bu muhim: hajm chegirmasi miqdorga bog'liq, ya'ni "12 dona × narx"
 * deb hisoblash NOTO'G'RI natija berardi.
 */
export function CartView() {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState('');

  const cart = useQuery({ queryKey: CART_KEY, queryFn: getCart });

  /** Server qaytargan savatni keshga yozadi — qayta so'rov kerak emas. */
  const applied = {
    onSuccess: (next: Cart) => {
      setError(null);
      client.setQueryData(CART_KEY, next);
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiRequestError ? err.message : 'Amalni bajarib bo‘lmadi.'),
  };

  const quantity = useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: number }) =>
      setCartQuantity(itemId, value),
    ...applied,
  });

  const remove = useMutation({ mutationFn: removeCartItem, ...applied });
  const clear = useMutation({ mutationFn: clearCart, ...applied });
  const promoMutation = useMutation({ mutationFn: setPromoCode, ...applied });

  if (cart.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (cart.isError || cart.data === undefined) {
    return (
      <p role="alert" className="text-sm text-[var(--color-danger)]">
        Savatni yuklab bo‘lmadi. Sahifani biroz keyinroq yangilang.
      </p>
    );
  }

  const data = cart.data;

  if (data.lines.length === 0) {
    return (
      <GlassCard className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-[var(--color-fg-muted)]">Savat bo‘sh.</p>
        <Button asChild>
          <Link href="/catalog">Katalogga o‘tish</Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {data.lines.map((line) => (
          <GlassCard as="li" key={line.itemId} className="flex gap-4 p-4">
            <div className="w-20 shrink-0 sm:w-24">
              <MediaFrame ratio="square">
                {line.image !== null ? (
                  <ApiImage
                    image={line.image}
                    alt={text(line.productName)}
                    sizes="96px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[var(--color-ink-700)]" />
                )}
              </MediaFrame>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{text(line.productName, line.sku)}</p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {line.volumeMl} ml
                    {line.unitsPerPack !== null && ` · ${line.unitsPerPack} dona/blok`}
                  </p>
                </div>

                <p className="text-right tabular-nums">
                  <span className="font-semibold">{formatMoney(line.total, line.currency)}</span>
                  <span className="block text-xs text-[var(--color-fg-subtle)]">
                    {formatMoney(line.unitPrice, line.currency)} × {line.quantity}
                  </span>
                </p>
              </div>

              {line.discount > 0 && (
                <p className="text-xs text-[var(--color-accent-text)]">
                  {line.promoApplied
                    ? 'Aksiya kodi'
                    : (line.discountRule?.name ??
                      (line.tierDiscountBasisPoints !== null
                        ? `Daraja chegirmasi ${formatPercent(line.tierDiscountBasisPoints)}`
                        : 'Chegirma'))}
                </p>
              )}

              {line.belowMinimum && line.minOrderQuantity !== null && (
                <Badge tone="warning">Eng kam buyurtma: {line.minOrderQuantity} dona</Badge>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <QuantityStepper
                  value={line.quantity}
                  label={`${text(line.productName)} miqdori`}
                  disabled={quantity.isPending}
                  onChange={(value) => quantity.mutate({ itemId: line.itemId, value })}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(line.itemId)}
                  disabled={remove.isPending}
                >
                  O‘chirish
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </ul>

      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Aksiya kodi"
            value={data.promoCode ?? promo}
            disabled={data.promoCode !== null}
            onChange={(event) => setPromo(event.target.value.toUpperCase())}
            className="flex-1"
          />

          {data.promoCode === null ? (
            <Button
              variant="secondary"
              onClick={() => promoMutation.mutate(promo.trim() === '' ? null : promo.trim())}
              disabled={promoMutation.isPending || promo.trim().length < 3}
            >
              Qo‘llash
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                setPromo('');
                promoMutation.mutate(null);
              }}
              disabled={promoMutation.isPending}
            >
              Olib tashlash
            </Button>
          )}
        </div>

        <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-4">
          <p className="text-sm text-[var(--color-fg-muted)]">Jami</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(data.total, data.currency)}
          </p>
        </div>

        {data.hasIssues && (
          <p className="text-sm text-[var(--color-warning)]">
            Ba’zi pozitsiyalarda eng kam buyurtma miqdori to‘lmagan. Buyurtma berishdan oldin
            miqdorni oshiring.
          </p>
        )}

        <Button variant="ghost" size="sm" onClick={() => clear.mutate()} disabled={clear.isPending}>
          Savatni bo‘shatish
        </Button>
      </GlassCard>

      {/* Rasmiylashtirish shu yerda — savat sahifasining O'ZIDA. */}
      <Checkout cart={data} />
    </div>
  );
}
