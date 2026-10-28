'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Checkbox, GlassCard, Input } from '@barff/ui';
import { formatVolumeMl } from '@barff/utils';
import { adminCreate, adminUpdate } from '@/lib/admin-api';
import { ApiRequestError } from '@/lib/api-client';
import { formatSom, parseSom, somInput, suggestVariantSku } from '@/lib/product-form';
import { type AdminVariant } from './types';

interface VariantForm {
  volumeMl: string;
  sku: string;
  barcode: string;
  unitsPerPack: string;
  price: string;
  isActive: boolean;
}

function toForm(variant: AdminVariant | null, productSku: string): VariantForm {
  if (variant === null) {
    return {
      volumeMl: '',
      sku: `${productSku}-`,
      barcode: '',
      unitsPerPack: '',
      price: '',
      isActive: true,
    };
  }

  return {
    volumeMl: String(variant.volumeMl),
    sku: variant.sku,
    barcode: variant.barcode ?? '',
    unitsPerPack: variant.unitsPerPack === null ? '' : String(variant.unitsPerPack),
    price: somInput(variant.currentPrice?.amount),
    isActive: variant.isActive,
  };
}

/** Narx tarixi — "kim qachon qaysi narxni qo'ydi" savoliga jurnal bilan birga javob. */
function PriceHistory({ variant }: { variant: AdminVariant }) {
  if (variant.prices.length === 0) return null;

  return (
    <details className="text-xs text-[var(--color-fg-muted)]">
      <summary className="cursor-pointer">Narx tarixi ({variant.prices.length})</summary>
      <ul className="mt-1 flex flex-col gap-0.5">
        {variant.prices.map((price) => (
          <li key={price.id}>
            {new Date(price.validFrom).toLocaleDateString('uz-UZ')} — {formatSom(price.amount)}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Bitta variant qatori (mavjud yoki yangi).
 *
 * Saqlash ikki ishni qiladi: o'zgargan variant maydonlarini yuboradi
 * va narx o'zgargan bo'lsa YANGI narx qo'shadi (eski narx tarixda qoladi).
 */
function VariantRow({
  productId,
  productSku,
  variant,
  onDone,
}: {
  productId: string;
  productSku: string;
  variant: AdminVariant | null;
  onDone?: () => void;
}) {
  const client = useQueryClient();
  const [form, setForm] = useState<VariantForm>(() => toForm(variant, productSku));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const volume = Number(form.volumeMl);
      if (!Number.isInteger(volume) || volume < 1) {
        throw new Error('Hajm millilitrda butun son bo‘lishi kerak (masalan 500).');
      }

      const units = form.unitsPerPack.trim();
      if (units !== '' && (!/^\d+$/.test(units) || Number(units) < 1)) {
        throw new Error('Qadoqdagi dona soni butun son bo‘lishi kerak.');
      }

      const priceText = form.price.trim();
      const amount = priceText === '' ? null : parseSom(priceText);
      if (priceText !== '' && amount === null) {
        throw new Error('Narx noto‘g‘ri. Faqat raqam kiriting (masalan 18000 yoki 18000,50).');
      }

      const body = {
        volumeMl: volume,
        sku: form.sku.trim(),
        ...(form.barcode.trim() !== '' ? { barcode: form.barcode.trim() } : {}),
        ...(units !== '' ? { unitsPerPack: Number(units) } : {}),
        isActive: form.isActive,
      };

      let variantId = variant?.id;

      if (variant === null) {
        const created = await adminCreate<{ id: string }>(
          `/admin/products/${productId}/variants`,
          body,
        );
        variantId = created.id;
      } else {
        await adminUpdate(`/admin/products/variants/${variant.id}`, body);
      }

      // Narx FAQAT o'zgarganda qo'shiladi: har saqlashda yangi qator tarixni ifloslantiradi.
      const current = variant?.currentPrice?.amount ?? null;
      if (amount !== null && amount !== current && variantId !== undefined) {
        await adminCreate(`/admin/products/variants/${variantId}/prices`, { amount });
      }
    },
    onSuccess: async () => {
      setError(null);
      setSaved(true);
      await client.invalidateQueries({ queryKey: ['admin-product', productId] });
      if (variant === null) setForm(toForm(null, productSku));
      onDone?.();
    },
    onError: (err) => {
      setSaved(false);
      setError(
        err instanceof ApiRequestError || err instanceof Error
          ? err.message
          : 'Saqlab bo‘lmadi. Qayta urinib ko‘ring.',
      );
      // Variant yaratilib narx yiqilgan bo'lishi mumkin: ro'yxatni yangilaymiz.
      void client.invalidateQueries({ queryKey: ['admin-product', productId] });
    },
  });

  const set = (patch: Partial<VariantForm>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Input
          label="Hajm (ml)"
          inputMode="numeric"
          value={form.volumeMl}
          onChange={(event) => {
            const volumeMl = event.target.value;
            // Yangi variantda SKU hajmga qarab to'ldiriladi (qo'lda o'zgartirilmagan bo'lsa).
            const autoSku = variant === null && /^\d*$/.test(volumeMl);
            set({
              volumeMl,
              ...(autoSku && volumeMl !== ''
                ? { sku: suggestVariantSku(productSku, Number(volumeMl)) }
                : {}),
            });
          }}
        />
        <div className="md:col-span-2">
          <Input
            label="Artikul (SKU)"
            value={form.sku}
            onChange={(event) => set({ sku: event.target.value })}
          />
        </div>
        <Input
          label="Narx (so‘m)"
          inputMode="decimal"
          hint={
            variant?.currentPrice ? `Hozir: ${formatSom(variant.currentPrice.amount)}` : undefined
          }
          value={form.price}
          onChange={(event) => set({ price: event.target.value })}
        />
        <Input
          label="Qadoqda (dona)"
          inputMode="numeric"
          value={form.unitsPerPack}
          onChange={(event) => set({ unitsPerPack: event.target.value })}
        />
        <Input
          label="Shtrix-kod"
          inputMode="numeric"
          value={form.barcode}
          onChange={(event) => set({ barcode: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Saytda ko‘rinsin"
            checked={form.isActive}
            onCheckedChange={(checked) => set({ isActive: checked === true })}
          />
          {variant !== null && (
            <Badge tone={variant.isActive ? 'success' : 'neutral'}>
              {formatVolumeMl(variant.volumeMl)}
            </Badge>
          )}
          {variant !== null && <PriceHistory variant={variant} />}
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span role="status" className="text-sm text-[var(--color-fg-muted)]">
              Saqlandi
            </span>
          )}
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saqlanmoqda' : variant === null ? 'Variant qo‘shish' : 'Saqlash'}
          </Button>
        </div>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </li>
  );
}

export function VariantsSection({
  productId,
  productSku,
  variants,
}: {
  productId: string;
  productSku: string;
  variants: AdminVariant[];
}) {
  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Variantlar va narxlar</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Har bir hajm alohida variant. Narx so‘mda kiritiladi; o‘zgartirsangiz eski narx tarixda
          qoladi. Narxsiz variant saytda ko‘rinadi, lekin dilerlar savatga qo‘sha olmaydi.
        </p>
      </div>

      {variants.length === 0 && (
        <p className="text-sm text-[var(--color-fg-muted)]">Hali variant yo‘q.</p>
      )}

      <ul className="flex flex-col gap-3">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            productId={productId}
            productSku={productSku}
            variant={variant}
          />
        ))}
      </ul>

      <div>
        <h3 className="mb-2 text-sm font-medium">Yangi variant</h3>
        <ul>
          <VariantRow productId={productId} productSku={productSku} variant={null} />
        </ul>
      </div>
    </GlassCard>
  );
}
