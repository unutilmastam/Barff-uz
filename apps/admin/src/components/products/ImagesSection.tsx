'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, GlassCard } from '@barff/ui';
import { adminCreate, adminDelete, adminUpdate } from '@/lib/admin-api';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { thumbUrl } from '@/lib/product-form';
import { type MediaAsset } from '@/components/fields/MediaPicker';
import { type AdminProductImage } from './types';

/**
 * Mahsulot rasmlari.
 *
 * Yuklash ikki bosqichli: fayl `/media` ga ketadi (turi SERVERDA imzo
 * baytlari bo'yicha tekshiriladi, AVIF/WebP variantlari tayyorlanadi),
 * so'ng mahsulotga biriktiriladi. Rasm O'ZGARTIRILMAYDI — shisha shakli
 * va yorlig'i asl holida qoladi.
 */
export function ImagesSection({
  productId,
  images,
}: {
  productId: string;
  images: AdminProductImage[];
}) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = () => client.invalidateQueries({ queryKey: ['admin-product', productId] });

  const fail = (err: unknown) =>
    setError(
      err instanceof ApiRequestError ? err.message : 'Bajarib bo‘lmadi. Qayta urinib ko‘ring.',
    );

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      let order = images.length;

      for (const file of files) {
        const form = new FormData();
        // Mahsulot rasmi OMMAVIY bo'lishi shart: maxfiy fayl saytda ochilmaydi.
        form.append('visibility', 'PUBLIC');
        form.append('file', file);

        const asset = await apiFetch<MediaAsset>('/media', { method: 'POST', body: form });
        await adminCreate(`/admin/products/${productId}/images`, {
          mediaAssetId: asset.id,
          isPrimary: false,
          displayOrder: order++,
        });
      }
    },
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: async (err) => {
      fail(err);
      await refresh();
    },
  });

  const makePrimary = useMutation({
    mutationFn: (imageId: string) =>
      adminUpdate(`/admin/products/images/${imageId}`, { isPrimary: true }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (imageId: string) => adminDelete(`/admin/products/images/${imageId}`),
    onSuccess: async () => {
      setConfirmId(null);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Rasmlar</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Asosiy rasm ro‘yxat va bosh sahifada ko‘rinadi. Eng yaxshisi — fonsiz (shaffof) PNG yoki
          to‘g‘ri burchakli fotosurat. Fayl turi serverda tekshiriladi.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Rasm yuklash</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={upload.isPending}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length > 0) upload.mutate(files);
          }}
          className="text-sm text-[var(--color-fg-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1.5 file:text-[var(--color-accent-on)]"
        />
      </label>

      {upload.isPending && <p role="status">Yuklanmoqda…</p>}
      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-[var(--color-fg-muted)]">Hali rasm yo‘q.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((item) => {
            const src = thumbUrl(item.image);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-2"
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[var(--color-ink-800)]">
                  {src !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin: tashqi API manzili, optimizatsiya shart emas
                    <img
                      src={src}
                      alt={item.originalName}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="p-2 text-center text-xs break-all text-[var(--color-fg-subtle)]">
                      {item.originalName}
                    </span>
                  )}
                  {item.isPrimary && (
                    <span className="absolute top-1.5 left-1.5">
                      <Badge tone="success">Asosiy</Badge>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {!item.isPrimary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={makePrimary.isPending}
                      onClick={() => makePrimary.mutate(item.id)}
                    >
                      Asosiy qilish
                    </Button>
                  )}

                  {confirmId === item.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(item.id)}
                      >
                        Ha, olib tashlash
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Bekor
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(item.id)}
                    >
                      Olib tashlash
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
