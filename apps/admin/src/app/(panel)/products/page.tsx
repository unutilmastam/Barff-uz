'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Localized, type PublicImage } from '@barff/types';
import { Badge, GlassCard } from '@barff/ui';
import { DataTable } from '@/components/DataTable';
import { adminList, toRows } from '@/lib/admin-api';
import { formatPriceRange, thumbUrl } from '@/lib/product-form';

interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  name: Localized;
  isActive: boolean;
  category: { id: string; slug: string; name: Localized } | null;
  variantCount: number;
  priceFrom: number | null;
  priceTo: number | null;
  thumbnail: PublicImage | null;
}

const BUTTON_LINK =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium';

/**
 * Mahsulotlar (CLAUDE.md §4).
 *
 * DIQQAT: mahsulot ma'lumotlari — tarkib, hajm, narx, saqlash sharoiti —
 * BARFF dan keladi va o'ylab topilmaydi. Muharrir (`/products/[id]`) da
 * hammasi kiritiladi: asosiy ma'lumot, variantlar va narxlar, rasmlar.
 */
export default function ProductsPage() {
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => adminList<ProductRow>('/admin/products', { page, limit: 20 }),
  });

  const { rows, totalPages } = toRows(list.data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mahsulotlar</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Tarkib, hajm va narxlar BARFF dan keladi — o‘ylab topilmaydi.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/products/categories"
            className={`${BUTTON_LINK} border border-[var(--color-border)]`}
          >
            Kategoriyalar
          </Link>
          <Link
            href="/products/new"
            className={`${BUTTON_LINK} bg-[var(--color-accent)] text-[var(--color-accent-on)]`}
          >
            Yangi mahsulot
          </Link>
        </div>
      </div>

      <GlassCard className="p-4">
        <DataTable<ProductRow>
          caption="Mahsulotlar"
          rows={rows}
          rowId={(row) => row.id}
          loading={list.isLoading}
          error={list.isError}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Hali mahsulot yo‘q. «Yangi mahsulot» tugmasini bosing."
          columns={[
            {
              key: 'thumb',
              header: 'Rasm',
              cell: (row) => {
                const src = thumbUrl(row.thumbnail);

                return src !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin: tashqi API manzili
                  <img
                    src={src}
                    alt=""
                    className="h-12 w-12 rounded object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--color-fg-subtle)]">—</span>
                );
              },
            },
            {
              key: 'name',
              header: 'Nomi',
              cell: (row) => (
                <Link href={`/products/${row.id}`} className="font-medium underline">
                  {row.name.uz ?? row.slug}
                </Link>
              ),
            },
            { key: 'category', header: 'Kategoriya', cell: (row) => row.category?.name.uz ?? '—' },
            { key: 'sku', header: 'Artikul', cell: (row) => row.sku },
            {
              key: 'variants',
              header: 'Variantlar',
              align: 'end',
              cell: (row) => row.variantCount,
            },
            {
              key: 'price',
              header: 'Narx',
              align: 'end',
              cell: (row) => formatPriceRange(row.priceFrom, row.priceTo),
            },
            {
              key: 'isActive',
              header: 'Holat',
              cell: (row) => (
                <Badge tone={row.isActive ? 'success' : 'neutral'}>
                  {row.isActive ? 'Saytda' : 'Yashirin'}
                </Badge>
              ),
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
