'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { Badge, Button, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import {
  dealerStatusLabel,
  dealerStatusTone,
  nextDealerStatuses,
  reasonRequired,
} from '@/lib/dealer-labels';
import { formatDateTime } from '@/lib/order-labels';

interface DealerEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; fullName: string } | null;
}

interface DealerAddress {
  id: string;
  label: string;
  region: string;
  district: string | null;
  city: string | null;
  street: string;
  notes: string | null;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
}

/*
  Tiplar ATAYLAB yumshoq — buyurtma tafsilotida bo'lgani kabi.
  Server javobi kutilganidan kam maydon bilan kelsa (eski jarayon,
  qisman xato), panel OQ EKRANGA aylanmasligi kerak: bitta maydon
  yetishmagani uchun xodim hech narsa ko'rmasligi qabul qilinmaydi.
*/
interface DealerDetail {
  id: string;
  companyName: string;
  taxId?: string | null;
  region?: string;
  businessType?: string;
  status: string;
  statusReason?: string | null;
  creditLimit?: number | null;
  internalNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  tier?: { id: string; code: string; name: string; discountBasisPoints: number } | null;
  user?: { id: string; fullName?: string; email?: string; phone?: string | null } | null;
  reviewedBy?: { id: string; fullName: string } | null;
  addresses?: DealerAddress[];
  events?: DealerEvent[];
}

interface DealerTier {
  id: string;
  code: string;
  name: string;
  discountBasisPoints: number;
  isActive?: boolean;
}

const NO_TIER = '__none';

/** Tiyin → so'm, faqat ko'rsatish uchun. */
function tiyinToSom(value: number | null | undefined): string {
  return value == null ? '' : String(Math.round(value / 100));
}

/**
 * Diler tafsiloti: tasdiqlash, shartlar, manzillar, tarix.
 *
 * SABAB MAYDONI TUGMADAN OLDIN TEKSHIRILADI. Server
 * `dealerStatusUpdateSchema` da rad etish va to'xtatish uchun sababni
 * SHART qilgan. Panel buni oldindan bilmasa, xodim tugmani bosib
 * "Rad etish uchun sabab kiritilishi shart" xatosini ko'rardi —
 * forma esa sabab so'ramagan bo'lardi.
 *
 * DIQQAT: bu KOSMETIKA. Sababsiz so'rov to'g'ridan-to'g'ri
 * yuborilsa ham server `400` qaytaradi, va ruxsat
 * (`dealers.approve`) serverda tekshiriladi (CLAUDE.md §3).
 */
export default function DealerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [tierId, setTierId] = useState<string | null>(null);
  const [credit, setCredit] = useState<string | null>(null);

  const dealer = useQuery({
    queryKey: ['admin-dealer', id],
    queryFn: () => apiFetch<DealerDetail>(`/admin/dealers/${id}`),
  });

  const tiers = useQuery({
    queryKey: ['admin-dealer-tiers'],
    queryFn: () => apiFetch<DealerTier[]>('/admin/dealer-tiers'),
  });

  /*
    JORIY XODIMNING RUXSATLARI.

    `dealers.view` va `dealers.approve` BOSHQA-BOSHQA vakolat: sotuvchi
    dilerni ko'radi, lekin TASDIQLAY olmaydi. Ruxsati yo'q xodimga
    tugmani ko'rsatib, keyin `403` qaytarish — noto'g'ri va'da.

    DIQQAT: bu KOSMETIKA. Haqiqiy tekshiruv serverda
    (`@Permissions('dealers.approve')`).
  */
  const me = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => apiFetch<{ permissions: string[] }>('/auth/me'),
  });

  const allow = (permission: string): boolean => me.data?.permissions.includes(permission) === true;

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['admin-dealer', id] });
    await client.invalidateQueries({ queryKey: ['admin-dealers'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/dealers/${id}/status`, {
        method: 'PATCH',
        body: { status, ...(reason.trim().length > 0 ? { reason: reason.trim() } : {}) },
      }),
    onSuccess: async () => {
      setError(null);
      setReason('');
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Holatni o‘zgartirib bo‘lmadi.'),
  });

  const saveTerms = useMutation({
    mutationFn: (body: { tierId?: string | null; creditLimit?: number | null }) =>
      apiFetch(`/admin/dealers/${id}/terms`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setError(null);
      setTierId(null);
      setCredit(null);
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Shartlarni saqlab bo‘lmadi.'),
  });

  const saveNote = useMutation({
    mutationFn: (value: string) =>
      apiFetch(`/admin/dealers/${id}/terms`, { method: 'PATCH', body: { internalNote: value } }),
    onSuccess: async () => {
      setError(null);
      setNote(null);
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Izohni saqlab bo‘lmadi.'),
  });

  if (dealer.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (dealer.isError || dealer.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Diler topilmadi.
        </p>
        <Button asChild variant="secondary">
          <Link href="/dealers">Dilerlarga qaytish</Link>
        </Button>
      </div>
    );
  }

  const data = dealer.data;
  const transitions = nextDealerStatuses(data.status);
  const needsReason = transitions.some(reasonRequired);
  const currentTier = tierId ?? data.tier?.id ?? NO_TIER;
  const currentCredit = credit ?? tiyinToSom(data.creditLimit);

  const facts: [string, string | null | undefined][] = [
    ['Kontakt', data.user?.fullName],
    ['Email', data.user?.email],
    ['Telefon', data.user?.phone != null ? formatPhone(data.user.phone) : null],
    ['Hudud', data.region],
    ['STIR', data.taxId],
    ['Faoliyat turi', data.businessType],
    ['Ariza sanasi', formatDateTime(data.createdAt)],
    [
      "Ko'rib chiqildi",
      data.reviewedAt != null
        ? `${formatDateTime(data.reviewedAt)}${data.reviewedBy != null ? ` · ${data.reviewedBy.fullName}` : ''}`
        : null,
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dealers"
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:underline"
        >
          ← Dilerlar
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="display-3">{data.companyName}</h1>
          <Badge tone={dealerStatusTone(data.status)}>{dealerStatusLabel(data.status)}</Badge>
        </div>

        {data.statusReason != null && data.statusReason !== '' && (
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Sabab: {data.statusReason}</p>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <GlassCard className="p-5">
            <h2 className="display-4">Ariza ma‘lumotlari</h2>

            <dl className="mt-4 flex flex-col gap-3">
              {facts
                .filter(([, value]) => value != null && value !== '')
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="border-t border-[var(--color-line)] pt-3 first:border-0 first:pt-0"
                  >
                    <dt className="text-xs text-[var(--color-fg-subtle)]">{label}</dt>
                    <dd className="mt-0.5 text-sm">{value}</dd>
                  </div>
                ))}
            </dl>
          </GlassCard>

          {/* --- MANZILLAR --- */}
          <GlassCard className="p-5">
            <h2 className="display-4">Yetkazib berish manzillari</h2>

            {(data.addresses ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
                Diler hali manzil qo‘shmagan. Buyurtma berishdan oldin u portalda qo‘shadi.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {(data.addresses ?? []).map((address) => (
                  <li key={address.id} className="border-t border-[var(--color-line)] pt-3">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {address.label}
                      {address.isDefault && <Badge tone="brand">Asosiy</Badge>}
                    </p>
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {[address.region, address.district, address.city, address.street]
                        .filter((part) => part != null && part !== '')
                        .join(', ')}
                    </p>
                    <p className="text-sm text-[var(--color-fg-subtle)]">
                      {address.contactName} · {formatPhone(address.contactPhone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* --- TARIX --- */}
          <GlassCard className="p-5">
            <h2 className="display-4">Tarix</h2>

            <ol className="mt-4 flex flex-col gap-4">
              {(data.events ?? []).map((event) => (
                <li key={event.id} className="border-l-2 border-[var(--color-line-strong)] pl-4">
                  <p className="text-sm">
                    {event.fromStatus === null
                      ? `Ariza yuborildi — ${dealerStatusLabel(event.toStatus)}`
                      : `${dealerStatusLabel(event.fromStatus)} → ${dealerStatusLabel(event.toStatus)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
                    {formatDateTime(event.createdAt)}
                    {event.actor != null && ` · ${event.actor.fullName}`}
                  </p>
                  {event.note != null && (
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{event.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-6">
          {/* --- HOLAT --- */}
          {allow('dealers.approve') && (
            <GlassCard className="flex flex-col gap-4 p-5">
              <h2 className="display-4">Holatni o‘zgartirish</h2>

              {transitions.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  Bu holatdan o‘tish mumkin emas.
                </p>
              ) : (
                <>
                  {needsReason && (
                    <Textarea
                      label="Sabab"
                      rows={3}
                      hint="Rad etish va to‘xtatish uchun SHART. Tarixda saqlanadi."
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    {transitions.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={reasonRequired(status) ? 'secondary' : 'primary'}
                        disabled={
                          setStatus.isPending ||
                          (reasonRequired(status) && reason.trim().length === 0)
                        }
                        onClick={() => setStatus.mutate(status)}
                      >
                        {dealerStatusLabel(status)}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>
          )}

          {/* --- SHARTLAR --- */}
          {allow('dealers.manage') && (
            <GlassCard className="flex flex-col gap-4 p-5">
              <h2 className="display-4">Daraja va kredit limiti</h2>
              <p className="text-sm text-[var(--color-fg-subtle)]">
                Daraja narx qoidalariga ta‘sir qiladi (S23). Kredit limiti — so‘mda.
              </p>

              <Select
                label="Daraja"
                value={currentTier}
                onValueChange={setTierId}
                disabled={tiers.isPending}
                options={[
                  { value: NO_TIER, label: 'Darajasiz' },
                  ...(tiers.data ?? []).map((tier) => ({
                    value: tier.id,
                    label: `${tier.name} (${(tier.discountBasisPoints / 100).toFixed(2)}%)`,
                  })),
                ]}
              />

              <Input
                label="Kredit limiti (so‘m)"
                type="number"
                min={0}
                value={currentCredit}
                onChange={(event) => setCredit(event.target.value)}
                hint="Bo‘sh — limit yo‘q, faqat oldindan to‘lov."
              />

              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saveTerms.isPending || (tierId === null && credit === null)}
                  onClick={() =>
                    saveTerms.mutate({
                      tierId: currentTier === NO_TIER ? null : currentTier,
                      creditLimit:
                        currentCredit.trim() === ''
                          ? null
                          : Math.round(Number(currentCredit) * 100),
                    })
                  }
                >
                  Saqlash
                </Button>
              </div>
            </GlassCard>
          )}

          {/* --- ICHKI IZOH --- */}
          {allow('dealers.manage') && (
            <GlassCard className="flex flex-col gap-3 p-5">
              <h2 className="display-4">Ichki izoh</h2>
              <p className="text-sm text-[var(--color-fg-subtle)]">
                Bu matn DILERGA ko‘rsatilmaydi.
              </p>

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
                  disabled={saveNote.isPending || note === null}
                  onClick={() => saveNote.mutate(note ?? '')}
                >
                  Saqlash
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
