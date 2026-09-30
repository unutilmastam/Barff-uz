'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { type Paginated } from '@barff/types';
import { Badge, Button, Checkbox, Dialog, GlassCard, Input, Select, Textarea } from '@barff/ui';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { deliveryStatusLabel, deliveryStatusTone } from '@/lib/delivery-labels';

interface RouteDelivery {
  id: string;
  number: string;
  status: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  driver: { id: string; user: { fullName: string } } | null;
}

interface Route {
  id: string;
  code: string;
  name: string;
  scheduledFor: string;
  notes: string | null;
  driver: { id: string; user: { id: string; fullName: string; phone: string | null } } | null;
  vehicle: { id: string; plateNumber: string; model: string | null } | null;
  deliveries: RouteDelivery[];
}

interface DriverOption {
  id: string;
  isActive: boolean;
  user: { fullName: string };
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  model: string | null;
}

interface OpenDelivery {
  id: string;
  number: string;
  status: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
}

/** Bugun — `<input type="date">` uchun. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Marshrutlar — KUNLIK GURUH (`ROADMAP.md` S34).
 *
 * MARSHRUT BIRIKTIRISH EMAS, REJA. Yetkazmani guruhga qo'shish
 * haydovchi biriktirmaydi: marshrutda ham, yetkazmada ham
 * haydovchi bor va ikkalasini jim moslashtirish "kim olib
 * ketyapti" degan savolga ikkita javob berardi.
 *
 * Logist xohlasa bitta tugma bilan butun marshrutni biriktiradi —
 * lekin bu OSHKORA amal va u ALLAQACHON biriktirilganlarga
 * tegmaydi (`docs/DELIVERY-POLICY.md` §6).
 */
export default function RoutesPage() {
  const client = useQueryClient();

  const [date, setDate] = useState(today());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [attaching, setAttaching] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routes = useQuery({
    queryKey: ['routes', date],
    queryFn: () => apiFetch<Route[]>(`/delivery/routes?date=${date}`),
  });

  const drivers = useQuery({
    queryKey: ['logistics-drivers'],
    queryFn: () => apiFetch<DriverOption[]>('/delivery/drivers'),
  });

  const vehicles = useQuery({
    queryKey: ['logistics-vehicles'],
    queryFn: () => apiFetch<VehicleOption[]>('/delivery/vehicles'),
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['routes'] }),
      client.invalidateQueries({ queryKey: ['logistics-deliveries'] }),
    ]);
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiRequestError ? err.message : 'Amal bajarilmadi.');

  const save = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: Record<string, unknown> }) =>
      id === null
        ? apiFetch('/delivery/routes', { method: 'POST', body })
        : apiFetch(`/delivery/routes/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setCreating(false);
      setEditing(null);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const attach = useMutation({
    mutationFn: ({ id, deliveryIds }: { id: string; deliveryIds: string[] }) =>
      apiFetch(`/delivery/routes/${id}/deliveries`, { method: 'POST', body: { deliveryIds } }),
    onSuccess: async () => {
      setAttaching(null);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const detach = useMutation({
    mutationFn: ({ id, deliveryId }: { id: string; deliveryId: string }) =>
      apiFetch(`/delivery/routes/${id}/deliveries/${deliveryId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const assignAll = useMutation({
    mutationFn: (id: string) => apiFetch(`/delivery/routes/${id}/assign`, { method: 'POST' }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-3">Marshrutlar</h1>
          <p className="lead mt-2">Kunlik yo‘nalishlar va ularga biriktirilgan yetkazmalar.</p>
        </div>

        <Button onClick={() => setCreating(true)}>Marshrut yaratish</Button>
      </div>

      <GlassCard className="flex flex-wrap items-end gap-3 p-4">
        <Input
          label="Kun"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <Button variant="ghost" size="sm" onClick={() => setDate(today())}>
          Bugun
        </Button>
      </GlassCard>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {routes.isPending && <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>}

      {routes.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Marshrutlarni yuklab bo‘lmadi.
        </p>
      )}

      {routes.data !== undefined && routes.data.length === 0 && (
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Bu kunga marshrut yo‘q. Yo‘nalish yarating va unga yetkazmalarni qo‘shing.
          </p>
        </GlassCard>
      )}

      <div className="flex flex-col gap-4">
        {(routes.data ?? []).map((route) => {
          const unassigned = route.deliveries.filter(
            (row) =>
              row.driver === null && row.status !== 'DELIVERED' && row.status !== 'CANCELLED',
          ).length;

          return (
            <GlassCard key={route.id} className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs tracking-widest text-[var(--color-fg-subtle)] uppercase">
                    {route.code}
                  </p>
                  <h2 className="text-lg font-semibold">{route.name}</h2>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                    {route.driver?.user.fullName ?? 'Haydovchi belgilanmagan'}
                    {route.vehicle !== null && ` · ${route.vehicle.plateNumber}`}
                    {' · '}
                    {route.deliveries.length} ta yetkazma
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setAttaching(route)}>
                    Yetkazma qo‘shish
                  </Button>

                  {/*
                    BIRIKTIRISH TUGMASI FAQAT KERAK BO'LGANDA.

                    Hammasi biriktirilgan bo'lsa tugma hech nima
                    qilmaydi; uni ko'rsatib turish "bosdim, nima
                    o'zgardi?" degan savolni tug'dirardi.
                  */}
                  {unassigned > 0 && route.driver !== null && (
                    <Button
                      size="sm"
                      disabled={assignAll.isPending}
                      onClick={() => assignAll.mutate(route.id)}
                    >
                      {unassigned} tasini biriktirish
                    </Button>
                  )}

                  <Button size="sm" variant="ghost" onClick={() => setEditing(route)}>
                    Tahrirlash
                  </Button>
                </div>
              </div>

              {route.notes !== null && route.notes !== '' && (
                <p className="text-sm text-[var(--color-fg-muted)]">{route.notes}</p>
              )}

              {route.deliveries.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-subtle)]">Yetkazma qo‘shilmagan.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--color-line)]">
                  {route.deliveries.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <Link
                        href={`/logistics/${row.id}`}
                        className="tabular-nums underline-offset-4 hover:underline"
                      >
                        {row.number}
                      </Link>

                      <span className="min-w-0 flex-1 text-sm">
                        {row.shippingLabel}
                        <span className="block text-xs text-[var(--color-fg-subtle)]">
                          {row.shippingRegion}, {row.shippingAddress}
                        </span>
                      </span>

                      <span className="text-sm text-[var(--color-fg-muted)]">
                        {row.driver?.user.fullName ?? 'Biriktirilmagan'}
                      </span>

                      <Badge tone={deliveryStatusTone(row.status)}>
                        {deliveryStatusLabel(row.status)}
                      </Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={detach.isPending}
                        onClick={() => detach.mutate({ id: route.id, deliveryId: row.id })}
                      >
                        Chiqarish
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          );
        })}
      </div>

      {(creating || editing !== null) && (
        <RouteDialog
          route={editing}
          date={date}
          drivers={(drivers.data ?? []).filter((driver) => driver.isActive)}
          vehicles={vehicles.data ?? []}
          pending={save.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
          }}
          onSubmit={(body) => save.mutate({ id: editing?.id ?? null, body })}
        />
      )}

      {attaching !== null && (
        <AttachDialog
          route={attaching}
          pending={attach.isPending}
          onClose={() => {
            setAttaching(null);
            setError(null);
          }}
          onSubmit={(deliveryIds) => attach.mutate({ id: attaching.id, deliveryIds })}
        />
      )}
    </div>
  );
}

function RouteDialog({
  route,
  date,
  drivers,
  vehicles,
  pending,
  onClose,
  onSubmit,
}: {
  route: Route | null;
  date: string;
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState(route?.code ?? '');
  const [name, setName] = useState(route?.name ?? '');
  const [scheduledFor, setScheduledFor] = useState(
    route === null ? date : route.scheduledFor.slice(0, 10),
  );
  const [driverId, setDriverId] = useState(route?.driver?.id ?? '');
  const [vehicleId, setVehicleId] = useState(route?.vehicle?.id ?? '');
  const [notes, setNotes] = useState(route?.notes ?? '');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={route === null ? 'Marshrut yaratish' : route.code}
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || code.trim().length < 2 || name.trim().length < 2}
            onClick={() =>
              onSubmit({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                scheduledFor,
                /*
                  `null` — bog'lanishni UZISH. Bo'sh satr `id` emas
                  va server uni rad etardi.
                */
                driverId: driverId === '' ? null : driverId,
                vehicleId: vehicleId === '' ? null : vehicleId,
                notes: notes.trim(),
              })
            }
          >
            Saqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Kod"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          hint="Masalan CHLN-01. Takrorlanmaydi."
        />

        <Input
          label="Nomi"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <Input
          label="Kun"
          type="date"
          value={scheduledFor}
          onChange={(event) => setScheduledFor(event.target.value)}
        />

        <Select
          label="Haydovchi"
          value={driverId}
          onValueChange={setDriverId}
          hint="Marshrut haydovchisi — yetkazmalarga AVTOMATIK biriktirilmaydi."
          options={[
            { value: '', label: 'Belgilanmagan' },
            ...drivers.map((driver) => ({ value: driver.id, label: driver.user.fullName })),
          ]}
        />

        <Select
          label="Mashina"
          value={vehicleId}
          onValueChange={setVehicleId}
          options={[
            { value: '', label: 'Belgilanmagan' },
            ...vehicles.map((vehicle) => ({
              value: vehicle.id,
              label: `${vehicle.plateNumber}${vehicle.model !== null ? ` (${vehicle.model})` : ''}`,
            })),
          ]}
        />

        <Textarea
          label="Izoh"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Dialog>
  );
}

/**
 * Marshrutga yetkazma qo'shish.
 *
 * Ro'yxatda FAQAT ochiq va marshrutsiz yetkazmalar. Boshqa
 * marshrutdagi yetkazmani ko'rsatib, uni jim ko'chirish —
 * birovning kuni buzilishining eng oson yo'li.
 */
function AttachDialog({
  route,
  pending,
  onClose,
  onSubmit,
}: {
  route: Route;
  pending: boolean;
  onClose: () => void;
  onSubmit: (deliveryIds: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  /*
    NOMZODLAR SERVERDA FILTRLANADI.

    `unrouted` va `openOnly` — ro'yxat shartlari; ularni mijozda
    qo'llash sahifalashni buzardi (100 qatorlik sahifadan
    yaroqsizlari olib tashlanib, ro'yxat to'liq emasligi
    ko'rinmasdi).
  */
  const open = useQuery({
    queryKey: ['route-attach-candidates'],
    queryFn: () =>
      apiFetch<Paginated<OpenDelivery>>(
        '/delivery/assignments?limit=100&unrouted=true&openOnly=true',
      ),
  });

  const candidates = open.data?.items ?? [];

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`${route.code} — yetkazma qo‘shish`}
      closeLabel="Yopish"
      size="wide"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button disabled={pending || chosen.length === 0} onClick={() => onSubmit(chosen)}>
            {chosen.length === 0 ? 'Qo‘shish' : `${chosen.length} tasini qo‘shish`}
          </Button>
        </>
      }
    >
      {open.isPending && <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>}

      {!open.isPending && candidates.length === 0 && (
        <p className="text-sm text-[var(--color-fg-muted)]">Marshrutsiz yangi yetkazma yo‘q.</p>
      )}

      <ul className="flex flex-col divide-y divide-[var(--color-line)]">
        {candidates.map((row) => (
          <li key={row.id} className="py-2.5">
            <Checkbox
              label={`${row.number} — ${row.shippingLabel}`}
              hint={`${row.shippingRegion}, ${row.shippingAddress}`}
              checked={chosen.includes(row.id)}
              onCheckedChange={() => toggle(row.id)}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
