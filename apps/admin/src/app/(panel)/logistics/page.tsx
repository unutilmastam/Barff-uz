'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { DELIVERY_STATUSES, type Paginated } from '@barff/types';
import { Badge, Button, Dialog, GlassCard, Input, Select } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { deliveryStatusLabel, deliveryStatusTone, needsAttention } from '@/lib/delivery-labels';
import { formatDateTime } from '@/lib/order-labels';

interface DeliveryRow {
  id: string;
  number: string;
  status: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  scheduledFor: string | null;
  createdAt: string;
  order: {
    id: string;
    number: string;
    dealer: { id: string; companyName: string } | null;
    _count: { items: number };
  } | null;
  driver: { id: string; user: { id: string; fullName: string; phone: string | null } } | null;
  vehicle: { id: string; plateNumber: string; model: string | null } | null;
}

interface DriverRow {
  id: string;
  isActive: boolean;
  user: { id: string; fullName: string; phone: string | null };
  vehicle: { id: string; plateNumber: string } | null;
  _count: { deliveries: number };
}

interface VehicleRow {
  id: string;
  plateNumber: string;
  model: string | null;
}

/**
 * Yetkazish taxtasi (CLAUDE.md §6, `ROADMAP.md` S34).
 *
 * BOSHLANG'ICH KO'RINISH — DIQQAT TALAB QILADIGAN ISH.
 *
 * Standart filtr "ochiq" ishlar: topshirilgan va bekor qilinganlar
 * ko'rsatilmaydi. Logistning savoli "bugun nima bo'ldi" emas,
 * "hozir nima TO'XTAB turibdi" — biriktirilmagan va bajarilmagan
 * yetkazmalar.
 */
export default function LogisticsPage() {
  const client = useQueryClient();

  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState('');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<DeliveryRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drivers = useQuery({
    queryKey: ['logistics-drivers'],
    queryFn: () => apiFetch<DriverRow[]>('/delivery/drivers'),
  });

  const vehicles = useQuery({
    queryKey: ['logistics-vehicles'],
    queryFn: () => apiFetch<VehicleRow[]>('/delivery/vehicles'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (openOnly && status === '') params.set('openOnly', 'true');
  if (status !== '') params.set('status', status);
  if (driverId !== '') params.set('driverId', driverId);
  if (region.trim() !== '') params.set('region', region.trim());
  if (search.trim() !== '') params.set('search', search.trim());

  const deliveries = useQuery({
    queryKey: ['logistics-deliveries', params.toString()],
    queryFn: () => apiFetch<Paginated<DeliveryRow>>(`/delivery/assignments?${params.toString()}`),
  });

  /*
    "OCHIQ ISH" FILTRI SERVERDA (`openOnly`).

    Avval u mijozda edi va SAHIFALASHNI BUZARDI: 20 qatorlik
    sahifadan yopilganlari olib tashlanib, sahifada 12 ta qolardi,
    "jami" esa 20 ni ko'rsatardi — logist ro'yxat to'liq deb
    o'ylardi.

    Aniq holat tanlangan bo'lsa `openOnly` yuborilmaydi: u
    tanlovni jim bekor qilardi ("Topshirildi" ni tanlab, bo'sh
    ro'yxat ko'rish).
  */
  const rows = deliveries.data?.items ?? [];

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['logistics-deliveries'] });
  };

  const assign = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/delivery/${id}/assign`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setAssigning(null);
      setError(null);
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Biriktirib bo‘lmadi.'),
  });

  const attention = rows.filter((row) => needsAttention(row.status)).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Yetkazish</h1>
        <p className="lead mt-2">
          Biriktirilmagan va bajarilmagan yetkazmalar — to‘xtab qolgan ish.
        </p>
      </div>

      {attention > 0 && (
        <GlassCard className="border-[var(--color-warning)] p-4">
          <p className="text-sm">
            <strong>{attention} ta yetkazma diqqat talab qiladi</strong> — biriktirilmagan yoki
            bajarilmagan.
          </p>
        </GlassCard>
      )}

      <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Raqam bo‘yicha"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          label="Holat"
          value={status}
          onValueChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...DELIVERY_STATUSES.map((value) => ({
              value,
              label: deliveryStatusLabel(value),
            })),
          ]}
        />

        <Select
          label="Haydovchi"
          value={driverId}
          onValueChange={(next) => {
            setDriverId(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...(drivers.data ?? []).map((driver) => ({
              value: driver.id,
              label: driver.user.fullName,
            })),
          ]}
        />

        <Input
          label="Hudud"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          {/*
            ANIQ HOLAT TANLANGANDA BU TUGMA O'CHIQ.

            Ikkalasi bitta ustunga tegadi: holat tanlangan bo'lsa
            "faqat ochiq" hech nima qilmaydi, va yonib turgan tugma
            ishlayotgandek ko'rinardi.
          */}
          <Button
            variant={openOnly && status === '' ? 'primary' : 'ghost'}
            size="sm"
            disabled={status !== ''}
            onClick={() => setOpenOnly(!openOnly)}
          >
            {status !== ''
              ? 'Holat bo‘yicha filtr'
              : openOnly
                ? 'Faqat ochiq ishlar'
                : 'Hammasi ko‘rsatilmoqda'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('');
              setDriverId('');
              setRegion('');
              setSearch('');
              setPage(1);
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <DataTable<DeliveryRow>
        rows={rows}
        page={page}
        totalPages={deliveries.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        loading={deliveries.isPending}
        error={deliveries.isError}
        caption="Yetkazmalar"
        emptyMessage={
          openOnly && status === ''
            ? 'Ochiq yetkazma yo‘q — hamma ish yakunlangan.'
            : 'Yetkazma topilmadi.'
        }
        rowId={(row) => row.id}
        columns={[
          {
            key: 'number',
            header: 'Raqam',
            cell: (row) => (
              <Link
                href={`/logistics/${row.id}`}
                className="tabular-nums underline-offset-4 hover:underline"
              >
                {row.number}
              </Link>
            ),
          },
          {
            key: 'address',
            header: 'Manzil',
            cell: (row) => (
              <span>
                {row.shippingLabel}
                <span className="block text-xs text-[var(--color-fg-subtle)]">
                  {row.shippingRegion}, {row.shippingAddress}
                </span>
              </span>
            ),
          },
          {
            key: 'dealer',
            header: 'Diler',
            cell: (row) => row.order?.dealer?.companyName ?? '—',
          },
          {
            key: 'driver',
            header: 'Haydovchi',
            cell: (row) =>
              row.driver === null ? (
                <Button size="sm" variant="secondary" onClick={() => setAssigning(row)}>
                  Biriktirish
                </Button>
              ) : (
                <span>
                  {row.driver.user.fullName}
                  <span className="block text-xs text-[var(--color-fg-subtle)]">
                    {row.vehicle?.plateNumber ?? '—'}
                  </span>
                </span>
              ),
          },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => (
              <Badge tone={deliveryStatusTone(row.status)}>{deliveryStatusLabel(row.status)}</Badge>
            ),
          },
          { key: 'createdAt', header: 'Yaratildi', cell: (row) => formatDateTime(row.createdAt) },
        ]}
      />

      {assigning !== null && (
        <AssignDialog
          delivery={assigning}
          drivers={(drivers.data ?? []).filter((driver) => driver.isActive)}
          vehicles={vehicles.data ?? []}
          pending={assign.isPending}
          onClose={() => {
            setAssigning(null);
            setError(null);
          }}
          onSubmit={(body) => assign.mutate({ id: assigning.id, body })}
        />
      )}
    </div>
  );
}

/**
 * Haydovchi biriktirish.
 *
 * Mashina IXTIYORIY: berilmasa haydovchining odatdagisi olinadi
 * (server hal qiladi). Lekin u yetkazmaga ALOHIDA yoziladi —
 * haydovchi ertaga boshqa mashinada yursa, KECHAGI yetkazma
 * qaysi mashinada ketganini bilish kerak bo'ladi.
 */
function AssignDialog({
  delivery,
  drivers,
  vehicles,
  pending,
  onClose,
  onSubmit,
}: {
  delivery: DeliveryRow;
  drivers: DriverRow[];
  vehicles: VehicleRow[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Haydovchi biriktirish"
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || driverId === ''}
            onClick={() =>
              onSubmit({
                driverId,
                ...(vehicleId !== '' ? { vehicleId } : {}),
                ...(scheduledFor !== '' ? { scheduledFor } : {}),
              })
            }
          >
            Biriktirish
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-fg-muted)]">
          {delivery.number} · {delivery.shippingRegion}, {delivery.shippingAddress}
          <span className="block text-xs text-[var(--color-fg-subtle)]">
            {delivery.contactName} · {formatPhone(delivery.contactPhone)}
          </span>
        </p>

        {drivers.length === 0 ? (
          <p className="text-sm text-[var(--color-danger)]">
            Faol haydovchi yo‘q. Avval «Park» bo‘limida profil oching.
          </p>
        ) : (
          <Select
            label="Haydovchi"
            value={driverId}
            onValueChange={setDriverId}
            options={drivers.map((driver) => ({
              value: driver.id,
              label: `${driver.user.fullName}${driver.vehicle !== null ? ` — ${driver.vehicle.plateNumber}` : ''}`,
            }))}
          />
        )}

        <Select
          label="Mashina"
          value={vehicleId}
          onValueChange={setVehicleId}
          hint="Bo‘sh — haydovchining odatdagi mashinasi."
          options={[
            { value: '', label: 'Odatdagi' },
            ...vehicles.map((vehicle) => ({
              value: vehicle.id,
              label: `${vehicle.plateNumber}${vehicle.model !== null ? ` (${vehicle.model})` : ''}`,
            })),
          ]}
        />

        <Input
          label="Qaysi kunga"
          type="date"
          value={scheduledFor}
          onChange={(event) => setScheduledFor(event.target.value)}
        />
      </div>
    </Dialog>
  );
}
