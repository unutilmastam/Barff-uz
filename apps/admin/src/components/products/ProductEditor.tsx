'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type Localized } from '@barff/types';
import { Button, Checkbox, GlassCard, Input, Select } from '@barff/ui';
import { LocalizedField, emptyLocalized } from '@/components/fields/LocalizedField';
import { adminCreate, adminGet, adminList, adminUpdate, toRows } from '@/lib/admin-api';
import { ApiRequestError } from '@/lib/api-client';
import {
  type ProductFormValue,
  suggestSku,
  suggestSlug,
  toProductPayload,
  validateProductForm,
} from '@/lib/product-form';
import { ImagesSection } from './ImagesSection';
import { type AdminCategory, type AdminProduct } from './types';
import { VariantsSection } from './VariantsSection';

function initialForm(product: AdminProduct | null): ProductFormValue {
  return {
    slug: product?.slug ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? '',
    name: product?.name ?? emptyLocalized(),
    description: product?.description ?? emptyLocalized(),
    ingredients: product?.ingredients ?? emptyLocalized(),
    storage: product?.storage ?? emptyLocalized(),
    flavor: product?.flavor ?? emptyLocalized(),
    shelfLifeDays: product?.shelfLifeDays == null ? '' : String(product.shelfLifeDays),
    displayOrder: product === null ? '' : String(product.displayOrder),
    isActive: product?.isActive ?? false,
  };
}

function BasicForm({
  product,
  categories,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [form, setForm] = useState<ProductFormValue>(() => initialForm(product));
  // Slug va SKU nomdan avtomatik to'ladi — qo'lda o'zgartirilguncha.
  const [slugTouched, setSlugTouched] = useState(product !== null);
  const [skuTouched, setSkuTouched] = useState(product !== null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const patch = (next: Partial<ProductFormValue>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...next }));
  };

  const setName = (name: Localized) => {
    const slug = slugTouched ? form.slug : suggestSlug(name);
    patch({ name, slug, ...(skuTouched ? {} : { sku: suggestSku(slug) }) });
  };

  const save = useMutation({
    mutationFn: async () => {
      const problem = validateProductForm(form);
      if (problem !== null) throw new Error(problem);

      const payload = toProductPayload(form);

      return product === null
        ? adminCreate<{ id: string }>('/admin/products', payload)
        : adminUpdate<{ id: string }>(`/admin/products/${product.id}`, payload);
    },
    onSuccess: async (result) => {
      setError(null);
      setSaved(true);
      await client.invalidateQueries({ queryKey: ['admin-products'] });
      await client.invalidateQueries({ queryKey: ['admin-product'] });

      // Yangi mahsulotdan keyin variant va rasm qo'shish uchun uning sahifasiga o'tamiz.
      if (product === null) router.replace(`/products/${result.id}`);
    },
    onError: (err) => {
      setSaved(false);
      setError(
        err instanceof ApiRequestError || err instanceof Error
          ? err.message
          : 'Saqlab bo‘lmadi. Qayta urinib ko‘ring.',
      );
    },
  });

  const noCategories = categories.length === 0;

  return (
    <GlassCard className="flex flex-col gap-5 p-5">
      <h2 className="text-lg font-semibold">Asosiy ma’lumot</h2>

      {noCategories ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Avval kategoriya yarating:{' '}
          <Link href="/products/categories" className="underline">
            Kategoriyalar
          </Link>
          .
        </p>
      ) : (
        <Select
          label="Kategoriya"
          required
          placeholder="Tanlang"
          value={form.categoryId === '' ? undefined : form.categoryId}
          onValueChange={(categoryId) => patch({ categoryId })}
          options={categories.map((category) => ({
            value: category.id,
            label: category.name.uz ?? category.slug,
          }))}
        />
      )}

      <LocalizedField label="Nomi" required value={form.name} onChange={setName} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Manzil (slug)"
          required
          hint={`Saytda: /products/${form.slug === '' ? '…' : form.slug}`}
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true);
            patch({ slug: event.target.value });
          }}
        />
        <Input
          label="Artikul (SKU)"
          required
          value={form.sku}
          onChange={(event) => {
            setSkuTouched(true);
            patch({ sku: event.target.value });
          }}
        />
      </div>

      <LocalizedField label="Ta’mi" value={form.flavor} onChange={(flavor) => patch({ flavor })} />
      <LocalizedField
        label="Tavsif"
        multiline
        value={form.description}
        onChange={(description) => patch({ description })}
      />
      <LocalizedField
        label="Tarkibi"
        multiline
        value={form.ingredients}
        onChange={(ingredients) => patch({ ingredients })}
      />
      <LocalizedField
        label="Saqlash sharoiti"
        value={form.storage}
        onChange={(storage) => patch({ storage })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Yaroqlilik muddati (kun)"
          inputMode="numeric"
          value={form.shelfLifeDays}
          onChange={(event) => patch({ shelfLifeDays: event.target.value })}
        />
        <Input
          label="Tartib raqami"
          inputMode="numeric"
          hint="Kichigi oldinda turadi."
          value={form.displayOrder}
          onChange={(event) => patch({ displayOrder: event.target.value })}
        />
      </div>

      <Checkbox
        label="Saytda ko‘rinsin"
        hint="Ma’lumotlar to‘liq va to‘g‘ri ekaniga ishonch hosil qilgach belgilang."
        checked={form.isActive}
        onCheckedChange={(checked) => patch({ isActive: checked === true })}
      />

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={save.isPending || noCategories}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saqlanmoqda' : product === null ? 'Yaratish' : 'Saqlash'}
        </Button>
        {saved && (
          <span role="status" className="text-sm text-[var(--color-fg-muted)]">
            Saqlandi
          </span>
        )}
      </div>
    </GlassCard>
  );
}

/** Mahsulot yaratish (`productId === null`) yoki tahrirlash sahifasi. */
export function ProductEditor({ productId }: { productId: string | null }) {
  const categories = useQuery({
    queryKey: ['admin-categories-all'],
    queryFn: () => adminList<AdminCategory>('/admin/categories', { limit: 100 }),
  });

  const product = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => adminGet<AdminProduct>(`/admin/products/${productId}`),
    enabled: productId !== null,
  });

  const loading = categories.isLoading || (productId !== null && product.isLoading);
  const failed = categories.isError || (productId !== null && product.isError);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/products" className="text-sm text-[var(--color-fg-muted)] underline">
          ← Mahsulotlar
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {productId === null ? 'Yangi mahsulot' : (product.data?.name.uz ?? 'Mahsulot')}
        </h1>
      </div>

      {loading && <p role="status">Yuklanmoqda…</p>}
      {failed && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Ma’lumotni yuklab bo‘lmadi.
        </p>
      )}

      {!loading && !failed && (
        <>
          {/* `key`: boshqa mahsulotga o'tilganda forma holati yangidan boshlanadi. */}
          <BasicForm
            key={product.data?.id ?? 'new'}
            product={product.data ?? null}
            categories={toRows(categories.data).rows}
          />

          {product.data !== undefined && (
            <>
              <VariantsSection
                productId={product.data.id}
                productSku={product.data.sku}
                variants={product.data.variants}
              />
              <ImagesSection productId={product.data.id} images={product.data.images} />
            </>
          )}

          {productId === null && (
            <p className="text-sm text-[var(--color-fg-muted)]">
              Yaratgandan keyin shu sahifada variantlar, narxlar va rasmlarni qo‘shasiz.
            </p>
          )}
        </>
      )}
    </div>
  );
}
