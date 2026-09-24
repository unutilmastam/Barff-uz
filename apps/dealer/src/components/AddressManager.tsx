'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Dialog, GlassCard, Input } from '@barff/ui';
import { formatPhone } from '@barff/utils';
import { ApiRequestError, apiFetch } from '@/lib/api-client';

interface Address {
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

type Form = {
  label: string;
  region: string;
  district: string;
  city: string;
  street: string;
  notes: string;
  contactName: string;
  contactPhone: string;
};

const EMPTY: Form = {
  label: '',
  region: '',
  district: '',
  city: '',
  street: '',
  notes: '',
  contactName: '',
  contactPhone: '',
};

/**
 * Manzillarni boshqarish.
 *
 * MIJOZDA o'qiladi: qo'shgandan keyin ro'yxat darhol yangilanishi
 * kerak, sahifani qayta yuklamasdan — diler telefonda ishlaydi va
 * har qayta yuklash sekin.
 *
 * STANDART MANZILNI bu yerda "olib tashlash" mumkin emas, faqat
 * BOSHQASIGA ko'chirish. Sabab serverda ham shunday (S22): standartsiz
 * qolgan diler buyurtma bera olmasdi.
 *
 * Bo'sh maydonlar YUBORILMAYDI: server `district: ''` ni "berilgan,
 * lekin noto'g'ri" deb tushunardi.
 */
export function AddressManager() {
  const client = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['dealer-addresses'],
    queryFn: () => apiFetch<Address[]>('/dealer/addresses'),
  });

  const invalidate = () => client.invalidateQueries({ queryKey: ['dealer-addresses'] });

  const create = useMutation({
    mutationFn: (value: Form) =>
      apiFetch<Address>('/dealer/addresses', { method: 'POST', body: clean(value) }),
    onSuccess: async () => {
      setForm(null);
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(message(err)),
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Address>(`/dealer/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } }),
    onSuccess: invalidate,
    onError: (err) => setError(message(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/dealer/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
    onError: (err) => setError(message(err)),
  });

  const addresses = list.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setForm({ ...EMPTY })}>Manzil qo‘shish</Button>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {list.isPending && (
        <p role="status" className="text-sm text-[var(--color-fg-muted)]">
          Yuklanmoqda…
        </p>
      )}

      {list.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Ma’lumotni yuklab bo‘lmadi. Sahifani biroz keyinroq yangilang.
        </p>
      )}

      {!list.isPending && !list.isError && addresses.length === 0 && (
        <GlassCard className="p-5">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Hozircha manzil yo‘q. Birinchi manzil avtomatik standart bo‘ladi.
          </p>
        </GlassCard>
      )}

      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <GlassCard as="li" key={address.id} className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{address.label}</p>
              {address.isDefault && <Badge tone="brand">Standart</Badge>}
            </div>

            <p className="text-sm text-[var(--color-fg-muted)]">
              {[address.region, address.district, address.city, address.street]
                .filter((part) => part !== null && part !== '')
                .join(', ')}
            </p>

            <p className="text-sm text-[var(--color-fg-subtle)]">
              {address.contactName} · {formatPhone(address.contactPhone)}
            </p>

            <div className="flex flex-wrap gap-2">
              {!address.isDefault && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => makeDefault.mutate(address.id)}
                  disabled={makeDefault.isPending}
                >
                  Standart qilish
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(address.id)}
                disabled={remove.isPending}
              >
                O‘chirish
              </Button>
            </div>
          </GlassCard>
        ))}
      </ul>

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) setForm(null);
        }}
        title="Yangi manzil"
        closeLabel="Yopish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (form !== null) create.mutate(form);
              }}
              disabled={create.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        {form !== null && (
          <div className="flex flex-col gap-4">
            <Input
              label="Nomi"
              required
              placeholder="Asosiy ombor"
              value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
            <Input
              label="Hudud"
              required
              value={form.region}
              onChange={(event) => setForm({ ...form, region: event.target.value })}
            />
            <Input
              label="Tuman"
              value={form.district}
              onChange={(event) => setForm({ ...form, district: event.target.value })}
            />
            <Input
              label="Shahar"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
            <Input
              label="Ko‘cha va uy"
              required
              value={form.street}
              onChange={(event) => setForm({ ...form, street: event.target.value })}
            />
            <Input
              label="Qabul qiluvchi"
              required
              value={form.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })}
            />
            <Input
              label="Telefon"
              required
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              value={form.contactPhone}
              onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
            />
            <Input
              label="Qo‘shimcha (mo‘ljal, qavat)"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** Bo'sh matnli ixtiyoriy maydonlar YUBORILMAYDI. */
function clean(value: Form): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter(([, text]) => text.trim().length > 0),
  ) as Record<string, string>;
}

function message(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;

  return 'Amalni bajarib bo‘lmadi.';
}
