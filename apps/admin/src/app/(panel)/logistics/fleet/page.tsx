'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Input,
  Select,
  Tabs,
  Textarea,
} from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string | null;
  capacityKg: number | null;
  isActive: boolean;
  notes: string | null;
}

interface Driver {
  id: string;
  licenseNumber: string | null;
  isActive: boolean;
  notes: string | null;
  user: { id: string; fullName: string; email: string; phone: string | null };
  vehicle: { id: string; plateNumber: string; model: string | null } | null;
  _count: { deliveries: number };
}

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

/**
 * Park — haydovchilar va mashinalar (CLAUDE.md §6, `ROADMAP.md` S34).
 *
 * BU YERDA AKKAUNT YARATILMAYDI. Haydovchi profili KIRISH HUQUQI
 * bermaydi: huquq `DRIVER` roli bilan beriladi. Shuning uchun forma
 * faqat MAVJUD, roli bor va profili yo'q foydalanuvchilarni
 * taklif qiladi — server ham shu shartni tekshiradi
 * (`fleet.service.ts`, `DRIVER_ROLE_MISSING`).
 *
 * Nomzod yo'q bo'lsa sabab OCHIQ yoziladi. Bo'sh ro'yxatni jim
 * ko'rsatish logistni "tizim buzilgan" degan xulosaga olib borardi,
 * holbuki kerakli qadam boshqa bo'limda — rol berish.
 */
export default function FleetPage() {
  const [includeInactive, setIncludeInactive] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Park</h1>
        <p className="lead mt-2">Haydovchilar va mashinalar.</p>
      </div>

      {/*
        FAOLSIZ YOZUVLAR YASHIRILGAN — LEKIN O'CHIRILMAGAN.

        Kundalik ishda logistga faqat faol haydovchi va mashina kerak;
        faolsizlari ro'yxatni to'ldirib, xato tanlashga olib borardi.
        Ular baribir kerak bo'ladi — tarixdagi yetkazma kim olib
        ketganini ko'rsatish uchun.
      */}
      <Checkbox
        label="Faolsizlarni ham ko‘rsatish"
        checked={includeInactive}
        onCheckedChange={(next) => setIncludeInactive(next === true)}
      />

      <Tabs
        label="Park bo‘limlari"
        items={[
          {
            value: 'drivers',
            label: 'Haydovchilar',
            content: <DriversPanel includeInactive={includeInactive} />,
          },
          {
            value: 'vehicles',
            label: 'Mashinalar',
            content: <VehiclesPanel includeInactive={includeInactive} />,
          },
        ]}
      />
    </div>
  );
}

/**
 * Bo'sh matn — chiziqcha.
 *
 * Tahrirlashda bo'sh qoldirilgan maydon `null` emas, `''` bo'lib
 * saqlanadi (sxema `null` qabul qilmaydi), va jadvalda bo'm-bo'sh
 * katak "ma'lumot yuklanmadi" degan taassurot berardi.
 */
function text(value: string | null): string {
  return value === null || value.trim() === '' ? '—' : value;
}

// ===========================================================================
// HAYDOVCHILAR
// ===========================================================================

function DriversPanel({ includeInactive }: { includeInactive: boolean }) {
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams(includeInactive ? { includeInactive: 'true' } : {});

  const drivers = useQuery({
    queryKey: ['fleet-drivers', includeInactive],
    queryFn: () => apiFetch<Driver[]>(`/delivery/drivers?${query.toString()}`),
  });

  const vehicles = useQuery({
    queryKey: ['fleet-vehicles', 'all'],
    queryFn: () => apiFetch<Vehicle[]>('/delivery/vehicles'),
  });

  const candidates = useQuery({
    queryKey: ['fleet-candidates'],
    queryFn: () => apiFetch<Candidate[]>('/delivery/drivers/candidates'),
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['fleet-drivers'] }),
      client.invalidateQueries({ queryKey: ['fleet-candidates'] }),
      client.invalidateQueries({ queryKey: ['logistics-drivers'] }),
    ]);
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiRequestError ? err.message : 'Saqlab bo‘lmadi.');

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/delivery/drivers', { method: 'POST', body }),
    onSuccess: async () => {
      setCreating(false);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/delivery/drivers/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setEditing(null);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Profil ochilishi uchun foydalanuvchida <strong>HAYDOVCHI</strong> roli bo‘lishi shart.
        </p>

        <Button size="sm" onClick={() => setCreating(true)}>
          Haydovchi profili
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <DataTable<Driver>
        rows={drivers.data ?? []}
        loading={drivers.isPending}
        error={drivers.isError}
        caption="Haydovchilar"
        emptyMessage="Haydovchi profili yo‘q."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'name',
            header: 'Haydovchi',
            cell: (row) => (
              <span>
                {row.user.fullName}
                <span className="block text-xs text-[var(--color-fg-subtle)]">
                  {row.user.phone === null ? row.user.email : formatPhone(row.user.phone)}
                </span>
              </span>
            ),
          },
          { key: 'license', header: 'Guvohnoma', cell: (row) => text(row.licenseNumber) },
          {
            key: 'vehicle',
            header: 'Odatdagi mashina',
            cell: (row) => row.vehicle?.plateNumber ?? '—',
          },
          {
            key: 'deliveries',
            header: 'Yetkazmalar',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{row._count.deliveries}</span>,
          },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => (
              <Badge tone={row.isActive ? 'success' : 'neutral'}>
                {row.isActive ? 'Faol' : 'Faolsiz'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Amal',
            cell: (row) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                Tahrirlash
              </Button>
            ),
          },
        ]}
      />

      {creating && (
        <DriverCreateDialog
          candidates={candidates.data ?? []}
          loading={candidates.isPending}
          vehicles={(vehicles.data ?? []).filter((vehicle) => vehicle.isActive)}
          pending={create.isPending}
          onClose={() => {
            setCreating(false);
            setError(null);
          }}
          onSubmit={(body) => create.mutate(body)}
        />
      )}

      {editing !== null && (
        <DriverEditDialog
          driver={editing}
          vehicles={vehicles.data ?? []}
          pending={update.isPending}
          onClose={() => {
            setEditing(null);
            setError(null);
          }}
          onSubmit={(body) => update.mutate({ id: editing.id, body })}
        />
      )}
    </div>
  );
}

function DriverCreateDialog({
  candidates,
  loading,
  vehicles,
  pending,
  onClose,
  onSubmit,
}: {
  candidates: Candidate[];
  loading: boolean;
  vehicles: Vehicle[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [chosen, setChosen] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [notes, setNotes] = useState('');

  /*
    TANLOV HOSILA, `useState` BOSHLANG'ICH QIYMATI EMAS.

    Nomzodlar ro'yxati oyna ochilgandan KEYIN kelishi mumkin, va
    boshlang'ich qiymat o'sha paytdagi bo'sh ro'yxatdan olinardi:
    ro'yxat kelsa ham tanlov bo'sh qolib, «Saqlash» mangu o'chiq
    turardi.
  */
  const userId = chosen !== '' ? chosen : (candidates[0]?.id ?? '');

  const empty = !loading && candidates.length === 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Haydovchi profili"
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || userId === ''}
            onClick={() =>
              onSubmit({
                userId,
                ...(licenseNumber.trim() !== '' ? { licenseNumber: licenseNumber.trim() } : {}),
                ...(vehicleId !== '' ? { vehicleId } : {}),
                ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
              })
            }
          >
            Saqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-[var(--color-fg-subtle)]">Nomzodlar yuklanmoqda…</p>
        ) : empty ? (
          /*
            BO'SH RO'YXAT SABABINI AYTADI.

            "Nomzod yo'q" ikki ma'noni bildiradi: hamma haydovchining
            profili bor, yoki hech kimga `DRIVER` roli berilmagan.
            Ikkinchisi — logist o'zi tuzata olmaydigan holat, shuning
            uchun keyingi qadam ko'rsatiladi.
          */
          <p className="text-sm text-[var(--color-fg-muted)]">
            Profil ochish uchun nomzod yo‘q. Profil faqat <strong>HAYDOVCHI</strong> roli bor va
            profili hali ochilmagan foydalanuvchiga ochiladi — rolni «Tizim → Foydalanuvchilar»
            bo‘limida admin beradi.
          </p>
        ) : (
          <Select
            label="Foydalanuvchi"
            value={userId}
            onValueChange={setChosen}
            hint="Faqat HAYDOVCHI roli bor va profili yo‘q foydalanuvchilar."
            options={candidates.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.fullName} — ${candidate.email}`,
            }))}
          />
        )}

        {/*
          NOMZOD YO'Q BO'LSA QOLGAN MAYDONLAR CHIQMAYDI.

          To'ldirib bo'lmaydigan formani ko'rsatish — foydalanuvchini
          bekorga ishlatish: «Saqlash» baribir o'chiq turadi va sabab
          formaning tepasida yozilgan.
        */}
        {!empty && !loading && (
          <>
            <Input
              label="Guvohnoma raqami"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
            />

            <Select
              label="Odatdagi mashina"
              value={vehicleId}
              onValueChange={setVehicleId}
              hint="Biriktirishda shu mashina taklif qilinadi."
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
          </>
        )}
      </div>
    </Dialog>
  );
}

function DriverEditDialog({
  driver,
  vehicles,
  pending,
  onClose,
  onSubmit,
}: {
  driver: Driver;
  vehicles: Vehicle[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [licenseNumber, setLicenseNumber] = useState(driver.licenseNumber ?? '');
  const [vehicleId, setVehicleId] = useState(driver.vehicle?.id ?? '');
  const [isActive, setIsActive] = useState(driver.isActive);
  const [notes, setNotes] = useState(driver.notes ?? '');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={driver.user.fullName}
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSubmit({
                licenseNumber: licenseNumber.trim(),
                /*
                  `null` — biriktirishni UZISH. Bo'sh satr yubormaydi:
                  server uchun `''` va `null` boshqa-boshqa narsa, va
                  `''` mavjud bo'lmagan mashina `id` si bo'lardi.
                */
                vehicleId: vehicleId === '' ? null : vehicleId,
                isActive,
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
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {driver.user.email}
          {driver.user.phone !== null && ` · ${formatPhone(driver.user.phone)}`}
        </p>

        <Input
          label="Guvohnoma raqami"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
        />

        <Select
          label="Odatdagi mashina"
          value={vehicleId}
          onValueChange={setVehicleId}
          options={[
            { value: '', label: 'Belgilanmagan' },
            ...vehicles.map((vehicle) => ({
              value: vehicle.id,
              label: `${vehicle.plateNumber}${vehicle.isActive ? '' : ' — faolsiz'}`,
            })),
          ]}
        />

        {/*
          FAOLSIZ QILISH — O'CHIRISH EMAS.

          Haydovchining yetkazmalari tarixda qoladi va ularga havola
          buzilmasligi kerak. Faolsiz haydovchi yangi yetkazmaga
          biriktirilmaydi, lekin kechagi yetkazma kim olib ketganini
          ko'rsatadi.
        */}
        <Checkbox
          label="Faol — yangi yetkazma biriktirish mumkin"
          checked={isActive}
          onCheckedChange={(next) => setIsActive(next === true)}
          hint={
            driver._count.deliveries > 0
              ? `${driver._count.deliveries} ta yetkazma tarixda qoladi.`
              : undefined
          }
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

// ===========================================================================
// MASHINALAR
// ===========================================================================

function VehiclesPanel({ includeInactive }: { includeInactive: boolean }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams(includeInactive ? { includeInactive: 'true' } : {});

  const vehicles = useQuery({
    queryKey: ['fleet-vehicles', includeInactive],
    queryFn: () => apiFetch<Vehicle[]>(`/delivery/vehicles?${query.toString()}`),
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['fleet-vehicles'] }),
      client.invalidateQueries({ queryKey: ['fleet-drivers'] }),
      client.invalidateQueries({ queryKey: ['logistics-vehicles'] }),
    ]);
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiRequestError ? err.message : 'Saqlab bo‘lmadi.');

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/delivery/vehicles', { method: 'POST', body }),
    onSuccess: async () => {
      setCreating(false);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/delivery/vehicles/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      setEditing(null);
      setError(null);
      await refresh();
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          Mashina qo‘shish
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <DataTable<Vehicle>
        rows={vehicles.data ?? []}
        loading={vehicles.isPending}
        error={vehicles.isError}
        caption="Mashinalar"
        emptyMessage="Mashina qo‘shilmagan."
        rowId={(row) => row.id}
        columns={[
          {
            key: 'plate',
            header: 'Davlat raqami',
            cell: (row) => <span className="font-medium tabular-nums">{row.plateNumber}</span>,
          },
          { key: 'model', header: 'Model', cell: (row) => text(row.model) },
          {
            key: 'capacity',
            header: 'Sig‘im',
            align: 'end',
            cell: (row) => (
              <span className="tabular-nums">
                {row.capacityKg === null ? '—' : `${row.capacityKg} kg`}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Holat',
            cell: (row) => (
              <Badge tone={row.isActive ? 'success' : 'neutral'}>
                {row.isActive ? 'Faol' : 'Faolsiz'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Amal',
            cell: (row) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                Tahrirlash
              </Button>
            ),
          },
        ]}
      />

      {(creating || editing !== null) && (
        <VehicleDialog
          vehicle={editing}
          pending={create.isPending || update.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
          }}
          onSubmit={(body) => {
            if (editing !== null) update.mutate({ id: editing.id, body });
            else create.mutate(body);
          }}
        />
      )}
    </div>
  );
}

function VehicleDialog({
  vehicle,
  pending,
  onClose,
  onSubmit,
}: {
  vehicle: Vehicle | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.plateNumber ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [capacityKg, setCapacityKg] = useState(
    vehicle?.capacityKg === null || vehicle?.capacityKg === undefined
      ? ''
      : String(vehicle.capacityKg),
  );
  const [isActive, setIsActive] = useState(vehicle?.isActive ?? true);
  const [notes, setNotes] = useState(vehicle?.notes ?? '');

  const capacity = Number.parseInt(capacityKg, 10);
  const capacityInvalid = capacityKg.trim() !== '' && (Number.isNaN(capacity) || capacity < 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={vehicle === null ? 'Mashina qo‘shish' : vehicle.plateNumber}
      closeLabel="Yopish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={pending || plateNumber.trim().length < 3 || capacityInvalid}
            onClick={() =>
              onSubmit({
                plateNumber: plateNumber.trim().toUpperCase(),
                model: model.trim(),
                ...(capacityKg.trim() !== '' ? { capacityKg: capacity } : {}),
                isActive,
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
          label="Davlat raqami"
          required
          value={plateNumber}
          onChange={(event) => setPlateNumber(event.target.value.toUpperCase())}
          hint="Kamida 3 belgi."
        />

        <Input label="Model" value={model} onChange={(event) => setModel(event.target.value)} />

        <Input
          label="Sig‘im (kg)"
          type="number"
          min={0}
          value={capacityKg}
          onChange={(event) => setCapacityKg(event.target.value)}
          error={capacityInvalid ? 'Butun, manfiy bo‘lmagan son.' : undefined}
        />

        <Checkbox
          label="Faol — biriktirishda taklif qilinadi"
          checked={isActive}
          onCheckedChange={(next) => setIsActive(next === true)}
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
