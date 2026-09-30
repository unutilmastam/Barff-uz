'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { type DeliveryStatus } from '@barff/types';
import { Badge, Button, GlassCard, Select, Textarea } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  nextDeliveryStatuses,
} from '@/lib/delivery-labels';
import { formatDateTime } from '@/lib/order-labels';

interface DeliveryEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; fullName: string } | null;
}

/* Tiplar YUMSHOQ — bitta maydon yetishmagani uchun oq ekran bo'lmasin (S28). */
interface DeliveryDetail {
  id: string;
  number: string;
  status: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  shippingNotes?: string | null;
  scheduledFor?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  receivedBy?: string | null;
  proofNote?: string | null;
  internalNote?: string | null;
  createdAt: string;
  order?: {
    id: string;
    number: string;
    status?: string;
    total?: number;
    currency?: string;
    dealer?: { id: string; companyName: string } | null;
    _count?: { items: number };
  } | null;
  driver?: { id: string; user?: { id: string; fullName?: string; phone?: string | null } } | null;
  vehicle?: { id: string; plateNumber: string; model?: string | null } | null;
  events?: DeliveryEvent[];
}

interface DriverRow {
  id: string;
  isActive: boolean;
  user: { id: string; fullName: string };
  vehicle: { id: string; plateNumber: string } | null;
}

function money(tiyin: number | undefined, currency = 'UZS'): string {
  if (tiyin === undefined) return '—';
  const whole = Math.round(tiyin / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${whole} ${currency === 'UZS' ? "so'm" : currency}`;
}

/**
 * Yetkazma tafsiloti (CLAUDE.md §6).
 *
 * BAJARILMAGAN YETKAZMANI QAYTA URINISH SHU YERDA.
 *
 * `FAILED -> ASSIGNED` avtomatik EMAS va bo'lmasligi kerak:
 * qaysi haydovchiga, qachon degan savol logistniki
 * (`docs/DELIVERY-POLICY.md` §3). Shuning uchun qayta urinish
 * HAYDOVCHINI QAYTA TANLASHNI talab qiladi — "yana urinib
 * ko'ring" tugmasi o'sha xatoni takrorlashga olib kelardi.
 */
export default function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [failing, setFailing] = useState(false);
  const [retryDriver, setRetryDriver] = useState('');

  const delivery = useQuery({
    queryKey: ['logistics-delivery', id],
    queryFn: () => apiFetch<DeliveryDetail>(`/delivery/${id}`),
  });

  const drivers = useQuery({
    queryKey: ['logistics-drivers'],
    queryFn: () => apiFetch<DriverRow[]>('/delivery/drivers'),
  });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['logistics-delivery', id] });
    await client.invalidateQueries({ queryKey: ['logistics-deliveries'] });
  };

  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof ApiRequestError ? err.message : fallback);

  const setStatus = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/delivery/${id}/status`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setError(null);
      setFailing(false);
      setReason('');
      await refresh();
    },
    onError: (err) => fail(err, 'Holatni o‘zgartirib bo‘lmadi.'),
  });

  const reassign = useMutation({
    mutationFn: (driverId: string) =>
      apiFetch(`/delivery/${id}/assign`, { method: 'PATCH', body: { driverId } }),
    onSuccess: async () => {
      setError(null);
      setRetryDriver('');
      await refresh();
    },
    onError: (err) => fail(err, 'Biriktirib bo‘lmadi.'),
  });

  const saveNote = useMutation({
    mutationFn: (value: string) =>
      apiFetch(`/delivery/${id}/internal-note`, { method: 'PUT', body: { internalNote: value } }),
    onSuccess: async () => {
      setError(null);
      setNote(null);
      await refresh();
    },
    onError: (err) => fail(err, 'Izohni saqlab bo‘lmadi.'),
  });

  if (delivery.isPending) {
    return (
      <p role="status" className="text-sm text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (delivery.isError || delivery.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Yetkazma topilmadi.
        </p>
        <Button asChild variant="secondary">
          <Link href="/logistics">Yetkazishga qaytish</Link>
        </Button>
      </div>
    );
  }

  const data = delivery.data;
  const steps = nextDeliveryStatuses(data.status);
  const activeDrivers = (drivers.data ?? []).filter((driver) => driver.isActive);

  const facts: [string, string | null | undefined][] = [
    ['Buyurtma', data.order?.number],
    ['Diler', data.order?.dealer?.companyName],
    ['Pozitsiya', data.order?._count?.items?.toString()],
    [
      'Summa',
      data.order?.total !== undefined ? money(data.order.total, data.order.currency) : null,
    ],
    ['Rejalashtirilgan', data.scheduledFor != null ? formatDateTime(data.scheduledFor) : null],
    ['Biriktirildi', data.assignedAt != null ? formatDateTime(data.assignedAt) : null],
    ['Olindi', data.pickedUpAt != null ? formatDateTime(data.pickedUpAt) : null],
    ['Topshirildi', data.deliveredAt != null ? formatDateTime(data.deliveredAt) : null],
    ['Qabul qildi', data.receivedBy],
    ['Haydovchi izohi', data.proofNote],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/logistics"
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:underline"
        >
          ← Yetkazish
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="display-3 tabular-nums">{data.number}</h1>
          <Badge tone={deliveryStatusTone(data.status)}>{deliveryStatusLabel(data.status)}</Badge>
        </div>

        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {formatDateTime(data.createdAt)}
        </p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {/* --- BAJARILMADI: SABAB VA QAYTA URINISH --- */}
      {data.status === 'FAILED' && (
        <GlassCard className="flex flex-col gap-4 border-[var(--color-danger)] p-5">
          <h2 className="display-4">Yetkazilmadi</h2>

          <p className="text-sm">
            <span className="text-[var(--color-fg-muted)]">Sabab: </span>
            {data.failureReason ?? '—'}
          </p>

          <p className="text-sm text-[var(--color-fg-subtle)]">
            Buyurtma holati O‘ZGARMAGAN — qayta urinish, bekor qilish yoki manzilni o‘zgartirish
            sizning qaroringiz.
          </p>

          {activeDrivers.length === 0 ? (
            <p className="text-sm text-[var(--color-danger)]">Faol haydovchi yo‘q.</p>
          ) : (
            <>
              {/*
                QAYTA URINISH HAYDOVCHINI QAYTA TANLASHNI TALAB
                QILADI. "Yana urinib ko'ring" tugmasi o'sha
                haydovchini o'sha manzilga qaytarardi — ya'ni o'sha
                xatoni takrorlardi.
              */}
              <Select
                label="Kimga qayta biriktirish"
                value={retryDriver}
                onValueChange={setRetryDriver}
                options={[
                  { value: '', label: 'Tanlang' },
                  ...activeDrivers.map((driver) => ({
                    value: driver.id,
                    label: driver.user.fullName,
                  })),
                ]}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={reassign.isPending || retryDriver === ''}
                  onClick={() => reassign.mutate(retryDriver)}
                >
                  Qayta biriktirish
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ status: 'CANCELLED' })}
                >
                  Yetkazmani bekor qilish
                </Button>
              </div>
            </>
          )}
        </GlassCard>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {/* --- MANZIL --- */}
          <GlassCard className="flex flex-col gap-2 p-5">
            <h2 className="display-4">Manzil</h2>
            <p className="mt-1 font-medium">{data.shippingLabel}</p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              {data.shippingRegion}, {data.shippingAddress}
            </p>
            <p className="text-sm text-[var(--color-fg-subtle)]">
              {data.contactName} · {formatPhone(data.contactPhone)}
            </p>
            {data.shippingNotes != null && (
              <p className="text-sm text-[var(--color-fg-subtle)]">{data.shippingNotes}</p>
            )}
          </GlassCard>

          {/* --- MA'LUMOTLAR --- */}
          <GlassCard className="p-5">
            <h2 className="display-4">Ma‘lumotlar</h2>

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

          {/* --- TARIX --- */}
          <GlassCard className="p-5">
            <h2 className="display-4">Tarix</h2>

            <ol className="mt-4 flex flex-col gap-4">
              {(data.events ?? []).map((event) => (
                <li key={event.id} className="border-l-2 border-[var(--color-line-strong)] pl-4">
                  <p className="text-sm">
                    {event.fromStatus === null
                      ? deliveryStatusLabel(event.toStatus)
                      : `${deliveryStatusLabel(event.fromStatus)} → ${deliveryStatusLabel(event.toStatus)}`}
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
          {/* --- HAYDOVCHI --- */}
          <GlassCard className="flex flex-col gap-3 p-5">
            <h2 className="display-4">Haydovchi</h2>

            {data.driver == null ? (
              <>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  Biriktirilmagan — hech kim bormayapti.
                </p>

                {activeDrivers.length > 0 && (
                  <>
                    <Select
                      label="Haydovchi"
                      value={retryDriver}
                      onValueChange={setRetryDriver}
                      options={[
                        { value: '', label: 'Tanlang' },
                        ...activeDrivers.map((driver) => ({
                          value: driver.id,
                          label: driver.user.fullName,
                        })),
                      ]}
                    />
                    <div>
                      <Button
                        size="sm"
                        disabled={reassign.isPending || retryDriver === ''}
                        onClick={() => reassign.mutate(retryDriver)}
                      >
                        Biriktirish
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">{data.driver.user?.fullName ?? '—'}</p>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {data.driver.user?.phone != null
                    ? formatPhone(data.driver.user.phone)
                    : 'Telefon yo‘q'}
                </p>
                <p className="text-sm text-[var(--color-fg-subtle)]">
                  {data.vehicle?.plateNumber ?? 'Mashina belgilanmagan'}
                  {data.vehicle?.model != null && ` · ${data.vehicle.model}`}
                </p>
              </>
            )}
          </GlassCard>

          {/* --- HOLAT --- */}
          {data.status !== 'FAILED' && steps.length > 0 && (
            <GlassCard className="flex flex-col gap-3 p-5">
              <h2 className="display-4">Holatni o‘zgartirish</h2>
              <p className="text-sm text-[var(--color-fg-subtle)]">
                Odatda holatni HAYDOVCHI o‘zgartiradi. Bu yerdagi tugmalar — u ishlay olmagan holat
                uchun.
              </p>

              {failing ? (
                <>
                  <Textarea
                    label="Sabab"
                    rows={3}
                    hint="SHART — sababsiz «yetkazilmadi» foydasiz yozuv."
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={setStatus.isPending || reason.trim() === ''}
                      onClick={() =>
                        setStatus.mutate({ status: 'FAILED', failureReason: reason.trim() })
                      }
                    >
                      Yuborish
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFailing(false)}>
                      Bekor qilish
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {steps.map((step) => (
                    <Button
                      key={step}
                      size="sm"
                      variant={step === 'CANCELLED' || step === 'FAILED' ? 'ghost' : 'primary'}
                      disabled={setStatus.isPending}
                      onClick={() =>
                        step === 'FAILED'
                          ? setFailing(true)
                          : setStatus.mutate({ status: step as DeliveryStatus })
                      }
                    >
                      {deliveryStatusLabel(step)}
                    </Button>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          {/* --- ICHKI IZOH --- */}
          <GlassCard className="flex flex-col gap-3 p-5">
            <h2 className="display-4">Ichki izoh</h2>
            <p className="text-sm text-[var(--color-fg-subtle)]">
              Bu matn DILERGA ham, HAYDOVCHIGA ham ko‘rsatilmaydi.
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
        </div>
      </div>
    </div>
  );
}
