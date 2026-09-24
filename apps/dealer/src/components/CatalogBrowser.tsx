'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Localized, type Paginated, type PublicImage } from '@barff/types';
import { Badge, Button, GlassCard, Input, MediaFrame, Select } from '@barff/ui';
import { ApiImage } from '@/components/ApiImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { CART_KEY, addToCart } from '@/lib/cart-api';
import { formatMoney, formatPercent } from '@/lib/money';

interface CatalogVariant {
  id: string;
  sku: string;
  volumeMl: number;
  unitsPerPack: number | null;
  minOrderQuantity: number | null;
  price: {
    basePrice: number;
    unitPrice: number;
    discount: number;
    currency: string;
    discountRule: { name: string } | null;
    tierDiscountBasisPoints: number | null;
  } | null;
}

interface CatalogProduct {
  id: string;
  slug: string;
  sku: string;
  name: Localized;
  flavor: Localized | null;
  category: { id: string; name: Localized } | null;
  image: PublicImage | null;
  variants: CatalogVariant[];
}

/** Ko'p tilli matn — portal o'zbek tilida (S24). */
const text = (value: Localized | null | undefined, fallback = '—'): string =>
  value?.uz ?? value?.ru ?? value?.en ?? fallback;

/**
 * Diler katalogi.
 *
 * NARX SERVERDAN KELADI va bu yerda HECH QANDAY hisob yo'q — hatto
 * "miqdor × narx" ham emas. Savatdagi jami ham serverdan olinadi
 * (CLAUDE.md §5: narx faqat bitta joyda hisoblanadi).
 *
 * MOBIL BIRINCHI: kartochkalar bitta ustunda boshlanadi, miqdor
 * tugmalari barmoq uchun katta (44px).
 */
export function CatalogBrowser() {
  const client = useQueryClient();

  const [categoryId, setCategoryId] = useState('');
  const [volumeMl, setVolumeMl] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['dealer-categories'],
    queryFn: () => apiFetch<{ id: string; name: Localized }[]>('/dealer/products/categories'),
  });

  const volumes = useQuery({
    queryKey: ['dealer-volumes'],
    queryFn: () => apiFetch<number[]>('/dealer/products/volumes'),
  });

  const params = new URLSearchParams({ limit: '24' });
  if (categoryId !== '') params.set('categoryId', categoryId);
  if (volumeMl !== '') params.set('volumeMl', volumeMl);
  if (search.trim() !== '') params.set('search', search.trim());

  const catalog = useQuery({
    queryKey: ['dealer-catalog', categoryId, volumeMl, search.trim()],
    queryFn: () => apiFetch<Paginated<CatalogProduct>>(`/dealer/products?${params.toString()}`),
  });

  const add = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      addToCart(variantId, quantity),
    onSuccess: async (_cart, variables) => {
      setError(null);
      setAdded(variables.variantId);
      await client.invalidateQueries({ queryKey: CART_KEY });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Savatga qo‘shib bo‘lmadi.'),
  });

  const products = catalog.data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <Input
          label="Qidiruv (kod yoki slug)"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:flex-1"
        />

        <Select
          label="Kategoriya"
          value={categoryId}
          onValueChange={setCategoryId}
          placeholder="Hammasi"
          options={[
            { value: '', label: 'Hammasi' },
            ...(categories.data ?? []).map((category) => ({
              value: category.id,
              label: text(category.name),
            })),
          ]}
        />

        <Select
          label="Hajm"
          value={volumeMl}
          onValueChange={setVolumeMl}
          placeholder="Hammasi"
          options={[
            { value: '', label: 'Hammasi' },
            ...(volumes.data ?? []).map((ml) => ({ value: String(ml), label: `${ml} ml` })),
          ]}
        />
      </GlassCard>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {catalog.isPending && (
        <p role="status" className="text-sm text-[var(--color-fg-muted)]">
          Yuklanmoqda…
        </p>
      )}

      {catalog.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Katalogni yuklab bo‘lmadi. Sahifani biroz keyinroq yangilang.
        </p>
      )}

      {!catalog.isPending && !catalog.isError && products.length === 0 && (
        <GlassCard className="p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">Tanlovga mos mahsulot topilmadi.</p>
        </GlassCard>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <GlassCard as="li" key={product.id} className="flex flex-col overflow-hidden">
            <MediaFrame
              ratio="wide"
              className="rounded-none border-0 border-b border-[var(--color-line)]"
            >
              {product.image !== null ? (
                <ApiImage
                  image={product.image}
                  alt={text(product.name)}
                  sizes="(max-width: 640px) 90vw, 320px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-fg-subtle)]">
                  Rasm yo‘q
                </div>
              )}
            </MediaFrame>

            <div className="flex flex-1 flex-col gap-3 p-4">
              {product.category !== null && (
                <p className="eyebrow">{text(product.category.name)}</p>
              )}

              <h2 className="display-4">{text(product.name, product.sku)}</h2>

              <ul className="mt-1 flex flex-col gap-3">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {variant.volumeMl} ml
                        {variant.unitsPerPack !== null && (
                          <span className="ml-2 text-xs font-normal text-[var(--color-fg-muted)]">
                            {variant.unitsPerPack} dona/blok
                          </span>
                        )}
                      </span>

                      {variant.price === null ? (
                        <span className="text-sm text-[var(--color-fg-subtle)]">
                          Narx belgilanmagan
                        </span>
                      ) : (
                        <span className="text-right tabular-nums">
                          <span className="font-semibold">
                            {formatMoney(variant.price.unitPrice, variant.price.currency)}
                          </span>
                          {variant.price.discount > 0 && (
                            <span className="ml-2 text-xs text-[var(--color-fg-subtle)] line-through">
                              {formatMoney(variant.price.basePrice, variant.price.currency)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {variant.price !== null && variant.price.discount > 0 && (
                      <p className="text-xs text-[var(--color-accent-text)]">
                        {variant.price.discountRule?.name ??
                          (variant.price.tierDiscountBasisPoints !== null
                            ? `Daraja chegirmasi ${formatPercent(variant.price.tierDiscountBasisPoints)}`
                            : 'Chegirma')}
                      </p>
                    )}

                    {variant.minOrderQuantity !== null && (
                      <p className="text-xs text-[var(--color-fg-subtle)]">
                        Eng kam buyurtma: {variant.minOrderQuantity} dona
                      </p>
                    )}

                    <AddToCart
                      variantId={variant.id}
                      initial={variant.minOrderQuantity ?? 1}
                      pending={add.isPending}
                      justAdded={added === variant.id}
                      onAdd={(quantity) => add.mutate({ variantId: variant.id, quantity })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        ))}
      </ul>
    </div>
  );
}

/** Miqdor tanlash va savatga qo'shish — variant bo'yicha alohida holat. */
function AddToCart({
  variantId,
  initial,
  pending,
  justAdded,
  onAdd,
}: {
  variantId: string;
  initial: number;
  pending: boolean;
  justAdded: boolean;
  onAdd: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(initial);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuantityStepper
        value={quantity}
        onChange={setQuantity}
        label={`Miqdor — ${variantId.slice(0, 8)}`}
      />

      <Button size="sm" onClick={() => onAdd(quantity)} disabled={pending}>
        Savatga
      </Button>

      {justAdded && (
        <Badge tone="success" aria-live="polite">
          Qo‘shildi
        </Badge>
      )}
    </div>
  );
}
