'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, GlassCard, Select, Textarea } from '@barff/ui';
import Link from 'next/link';
import { use, useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api-client';
import { adminGet } from '@/lib/admin-api';
import {
  BUSINESS_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  type LeadStatus,
  allowedTransitions,
  statusTone,
} from '@/lib/lead-labels';

interface LeadEvent {
  id: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  note: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string } | null;
}

interface LeadDetail {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  region: string;
  businessType: string;
  desiredProducts: string | null;
  estimatedMonthlyVolume: number | null;
  message: string | null;
  status: LeadStatus;
  createdAt: string;
  assignedTo: { id: string; fullName: string } | null;
  events: LeadEvent[];
}

interface Assignee {
  id: string;
  fullName: string;
  email: string;
}

/**
 * Ariza tafsiloti va tarixi (CLAUDE.md §9).
 *
 * Holat tugmalari FAQAT ruxsat etilgan o'tishlarni ko'rsatadi, lekin
 * bu kosmetika: qoida `@barff/types` dagi yagona jadvalda va SERVER
 * ham o'shani tekshiradi. API to'g'ridan-to'g'ri chaqirilsa,
 * noto'g'ri o'tish `400` bilan rad etiladi.
 */
export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useQueryClient();

  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const lead = useQuery({
    queryKey: ['admin-lead', id],
    queryFn: () => adminGet<LeadDetail>(`/admin/leads/${id}`),
  });

  const assignees = useQuery({
    queryKey: ['lead-assignees'],
    queryFn: () => adminGet<Assignee[]>('/admin/leads/assignees'),
  });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['admin-lead', id] });
    await client.invalidateQueries({ queryKey: ['admin-leads'] });
  };

  const changeStatus = useMutation({
    mutationFn: (to: LeadStatus) =>
      apiFetch(`/admin/leads/${id}/status`, {
        method: 'PATCH',
        // Izoh ixtiyoriy — bo'sh bo'lsa umuman yuborilmaydi.
        body: { status: to, ...(note.trim().length > 0 ? { note: note.trim() } : {}) },
      }),
    onSuccess: async () => {
      setNote('');
      setError(null);
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : "Holatni o'zgartirib bo'lmadi."),
  });

  const assign = useMutation({
    mutationFn: (assigneeId: string | null) =>
      apiFetch(`/admin/leads/${id}/assignee`, { method: 'PATCH', body: { assigneeId } }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : "Biriktirib bo'lmadi."),
  });

  if (lead.isLoading) {
    return (
      <p role="status" className="text-[var(--color-fg-muted)]">
        Yuklanmoqda…
      </p>
    );
  }

  if (lead.isError || lead.data === undefined) {
    return (
      <div role="alert" className="flex flex-col gap-3">
        <p className="font-medium">Ariza topilmadi</p>
        <Link href="/leads" className="text-sm text-[var(--color-accent-text)] underline">
          Arizalar ro‘yxatiga qaytish
        </Link>
      </div>
    );
  }

  const data = lead.data;
  const next = allowedTransitions(data.status);

  const facts = [
    ['Kontakt', data.contactName],
    ['Telefon', data.phone],
    ['Email', data.email],
    ['Hudud', data.region],
    ['Faoliyat turi', BUSINESS_TYPE_LABELS[data.businessType] ?? data.businessType],
    ['Qiziqtirgan mahsulotlar', data.desiredProducts],
    [
      'Oylik taxminiy hajm',
      data.estimatedMonthlyVolume === null ? null : `${data.estimatedMonthlyVolume} dona`,
    ],
    ['Izoh', data.message],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/leads"
          className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
        >
          Arizalar
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{data.companyName}</h1>
          <Badge tone={statusTone(data.status)}>{LEAD_STATUS_LABELS[data.status]}</Badge>
        </div>

        <p className="mt-1 text-sm text-[var(--color-fg-subtle)]">
          {new Date(data.createdAt).toLocaleString('uz-UZ')}
        </p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <GlassCard className="p-5">
            <h2 className="font-medium">Ariza ma‘lumotlari</h2>

            <dl className="mt-4 flex flex-col gap-3">
              {facts.map(([label, value]) => (
                <div
                  key={String(label)}
                  className="border-t border-[var(--color-line)] pt-3 first:border-0 first:pt-0"
                >
                  <dt className="text-xs text-[var(--color-fg-subtle)]">{label}</dt>
                  <dd className="mt-0.5 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="font-medium">Tarix</h2>

            {/* `<ol>` — hodisalar TARTIBLI: ekran o'quvchi ham shunday o'qiydi. */}
            <ol className="mt-4 flex flex-col gap-4">
              {data.events.map((event) => (
                <li key={event.id} className="border-l-2 border-[var(--color-line-strong)] pl-4">
                  <p className="text-sm">
                    {event.fromStatus === null
                      ? `Ariza qabul qilindi — ${LEAD_STATUS_LABELS[event.toStatus]}`
                      : `${LEAD_STATUS_LABELS[event.fromStatus]} → ${LEAD_STATUS_LABELS[event.toStatus]}`}
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
                    {new Date(event.createdAt).toLocaleString('uz-UZ')}
                    {event.actor !== null && ` · ${event.actor.fullName}`}
                  </p>

                  {event.note !== null && (
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{event.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-4 p-5">
            <h2 className="font-medium">Holatni o‘zgartirish</h2>

            {next.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)]">
                Ariza yopilgan. Yangi murojaat yangi ariza sifatida keladi.
              </p>
            ) : (
              <>
                <Textarea
                  label="Izoh"
                  rows={3}
                  hint="Tarixda saqlanadi."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  {next.map((to) => (
                    <Button
                      key={to}
                      size="sm"
                      variant={to === 'REJECTED' ? 'secondary' : 'primary'}
                      disabled={changeStatus.isPending}
                      onClick={() => changeStatus.mutate(to)}
                    >
                      {LEAD_STATUS_LABELS[to]}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </GlassCard>

          <GlassCard className="flex flex-col gap-4 p-5">
            <h2 className="font-medium">Mas‘ul xodim</h2>

            <Select
              label="Xodim"
              value={data.assignedTo?.id ?? '__none'}
              onValueChange={(value) => assign.mutate(value === '__none' ? null : value)}
              disabled={assign.isPending || assignees.isLoading}
              options={[
                { value: '__none', label: 'Biriktirilmagan' },
                ...(assignees.data ?? []).map((user) => ({
                  value: user.id,
                  label: user.fullName,
                })),
              ]}
            />

            <p className="text-xs text-[var(--color-fg-subtle)]">
              Ro‘yxatda faqat arizani yurita oladigan xodimlar ko‘rinadi.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
