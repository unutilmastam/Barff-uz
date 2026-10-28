'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Checkbox, Dialog, GlassCard, Input } from '@barff/ui';
import { DataTable } from '@/components/DataTable';
import { adminCreate, adminList, adminPut, adminUpdate, toRows } from '@/lib/admin-api';
import { ApiRequestError } from '@/lib/api-client';
import {
  STAFF_ROLE_OPTIONS,
  formatLastLogin,
  generatePassword,
  roleLabel,
} from '@/lib/user-labels';

interface StaffRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: string[];
}

interface StaffForm {
  id: string | null;
  email: string;
  fullName: string;
  phone: string;
  password: string;
  roles: string[];
  isActive: boolean;
}

const EMPTY: StaffForm = {
  id: null,
  email: '',
  fullName: '',
  phone: '',
  password: '',
  roles: [],
  isActive: true,
};

function errorText(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'Bajarib bo‘lmadi. Qayta urinib ko‘ring.';
}

/**
 * Xodimlar (CLAUDE.md §8: foydalanuvchilar va rollar).
 *
 * Ruxsat SERVERDA tekshiriladi: `users.manage` / `roles.manage`. Server uchta
 * himoyani o'zi ushlaydi — o'zini bloklash, o'zidan admin rolini olish va
 * oxirgi adminni olib tashlash; bu yerda ular xato xabari sifatida ko'rinadi.
 * Diler akkauntlari bu ro'yxatda YO'Q (ular «Dilerlar» bo'limida).
 */
export default function UsersPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<StaffForm | null>(null);
  const [resetFor, setResetFor] = useState<StaffRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => adminList<StaffRow>('/admin/users', { page, limit: 20 }),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['admin-users'] });

  const save = useMutation({
    mutationFn: async (value: StaffForm) => {
      if (value.roles.length === 0) throw new Error('Kamida bitta rol tanlang.');

      if (value.id === null) {
        return adminCreate('/admin/users', {
          email: value.email.trim(),
          fullName: value.fullName.trim(),
          ...(value.phone.trim() !== '' ? { phone: value.phone.trim() } : {}),
          password: value.password,
          roles: value.roles,
        });
      }

      const original =
        list.data === undefined
          ? undefined
          : toRows(list.data).rows.find((row) => row.id === value.id);
      const phone = value.phone.trim();

      // Faqat O'ZGARGAN maydonlar yuboriladi.
      const patch = {
        ...(value.fullName.trim() !== original?.fullName
          ? { fullName: value.fullName.trim() }
          : {}),
        ...(phone !== (original?.phone ?? '') ? { phone: phone === '' ? null : phone } : {}),
        ...(value.isActive !== original?.isActive ? { isActive: value.isActive } : {}),
      };
      if (Object.keys(patch).length > 0) await adminUpdate(`/admin/users/${value.id}`, patch);

      const sameRoles =
        [...value.roles].sort().join() === [...(original?.roles ?? [])].sort().join();
      if (!sameRoles) await adminPut(`/admin/users/${value.id}/roles`, { roles: value.roles });
    },
    onSuccess: async () => {
      setForm(null);
      setError(null);
      setDone('Saqlandi.');
      await refresh();
    },
    onError: (err) =>
      setError(
        err instanceof Error && !(err instanceof ApiRequestError) ? err.message : errorText(err),
      ),
  });

  const reset = useMutation({
    mutationFn: (input: { id: string; password: string }) =>
      adminCreate(`/admin/users/${input.id}/password`, { password: input.password }),
    onSuccess: async () => {
      setResetFor(null);
      setNewPassword('');
      setError(null);
      setDone('Parol yangilandi. Xodimning barcha sessiyalari yopildi.');
      await refresh();
    },
    onError: (err) => setError(errorText(err)),
  });

  const { rows, totalPages } = toRows(list.data);

  const toggleRole = (code: string) =>
    setForm((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            roles: prev.roles.includes(code)
              ? prev.roles.filter((item) => item !== code)
              : [...prev.roles, code],
          },
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xodimlar</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Admin panel, ombor va haydovchi ilovasiga kiradigan xodimlar. Dilerlar — «Dilerlar»
            bo‘limida.
          </p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setDone(null);
            setForm({ ...EMPTY, password: generatePassword() });
          }}
        >
          Yangi xodim
        </Button>
      </div>

      {done !== null && (
        <p role="status" className="text-sm text-[var(--color-fg-muted)]">
          {done}
        </p>
      )}

      <GlassCard className="p-4">
        <DataTable<StaffRow>
          caption="Xodimlar"
          rows={rows}
          rowId={(row) => row.id}
          loading={list.isLoading}
          error={list.isError}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Xodim yo‘q."
          columns={[
            {
              key: 'name',
              header: 'Xodim',
              cell: (row) => (
                <span className="flex flex-col">
                  <span className="font-medium">{row.fullName}</span>
                  <span className="text-xs text-[var(--color-fg-muted)]">{row.email}</span>
                </span>
              ),
            },
            {
              key: 'roles',
              header: 'Rol',
              cell: (row) => (
                <span className="flex flex-wrap gap-1">
                  {row.roles.map((role) => (
                    <Badge key={role} tone={role === 'ADMIN' ? 'brand' : 'neutral'}>
                      {roleLabel(role)}
                    </Badge>
                  ))}
                </span>
              ),
            },
            { key: 'phone', header: 'Telefon', cell: (row) => row.phone ?? '—' },
            {
              key: 'last',
              header: 'Oxirgi kirish',
              cell: (row) => formatLastLogin(row.lastLoginAt),
            },
            {
              key: 'status',
              header: 'Holat',
              cell: (row) => (
                <Badge tone={row.isActive ? 'success' : 'danger'}>
                  {row.isActive ? 'Faol' : 'Bloklangan'}
                </Badge>
              ),
            },
            {
              key: '__actions',
              header: 'Amallar',
              align: 'end',
              cell: (row) => (
                <span className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setError(null);
                      setDone(null);
                      setForm({
                        id: row.id,
                        email: row.email,
                        fullName: row.fullName,
                        phone: row.phone ?? '',
                        password: '',
                        roles: row.roles,
                        isActive: row.isActive,
                      });
                    }}
                  >
                    Tahrirlash
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setError(null);
                      setDone(null);
                      setNewPassword(generatePassword());
                      setResetFor(row);
                    }}
                  >
                    Parol
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </GlassCard>

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) setForm(null);
        }}
        size="wide"
        title={form?.id === null ? 'Yangi xodim' : 'Xodimni tahrirlash'}
        closeLabel="Yopish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Bekor qilish
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (form !== null) save.mutate(form);
              }}
            >
              {save.isPending ? 'Saqlanmoqda' : 'Saqlash'}
            </Button>
          </>
        }
      >
        {form !== null && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            {error !== null && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <Input
              label="To‘liq ismi"
              required
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
            <Input
              label="Email"
              type="email"
              required
              disabled={form.id !== null}
              hint={form.id === null ? 'Tizimga kirish uchun login.' : 'Email o‘zgartirilmaydi.'}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              label="Telefon"
              inputMode="tel"
              hint="+998 XX XXX XX XX"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />

            {form.id === null && (
              <div className="flex flex-col gap-2">
                <Input
                  label="Parol"
                  required
                  hint="Kamida 10 belgi. Xodimga topshiring — keyin ko‘rsatilmaydi."
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setForm({ ...form, password: generatePassword() })}
                  >
                    Yangi parol yaratish
                  </Button>
                </div>
              </div>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Rol</legend>
              {STAFF_ROLE_OPTIONS.map((role) => (
                <Checkbox
                  key={role.code}
                  label={role.label}
                  hint={role.hint}
                  checked={form.roles.includes(role.code)}
                  onCheckedChange={() => toggleRole(role.code)}
                />
              ))}
            </fieldset>

            {form.id !== null && (
              <Checkbox
                label="Faol"
                hint="Belgini olib tashlasangiz xodim darhol tizimdan chiqariladi va kira olmaydi."
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
              />
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={resetFor !== null}
        onOpenChange={(open) => {
          if (!open) setResetFor(null);
        }}
        title="Parolni yangilash"
        description={resetFor === null ? '' : `${resetFor.fullName} (${resetFor.email})`}
        closeLabel="Yopish"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetFor(null)}>
              Bekor qilish
            </Button>
            <Button
              disabled={reset.isPending}
              onClick={() => {
                if (resetFor !== null) reset.mutate({ id: resetFor.id, password: newPassword });
              }}
            >
              {reset.isPending ? 'Saqlanmoqda' : 'Parolni almashtirish'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {error !== null && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <Input
            label="Yangi parol"
            hint="Kamida 10 belgi. Xodimning hamma sessiyalari yopiladi."
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setNewPassword(generatePassword())}
            >
              Yangi parol yaratish
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
