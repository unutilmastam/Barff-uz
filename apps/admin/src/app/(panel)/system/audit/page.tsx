'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { type AuditFacets, type AuditLogEntry, type Paginated } from '@barff/types';
import { Button, GlassCard, Input, Pagination, Select } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';

interface Filters {
  from: string;
  to: string;
  actionPrefix: string;
  action: string;
  actor: string;
  entityId: string;
}

/**
 * "Hammasi" uchun BO'SH satr emas: tanlov komponenti bo'sh qiymatda
 * hech narsa ko'rsatmaydi (maydon bo'sh ko'rinadi), `ALL` esa
 * yorlig'i bilan chiqadi.
 */
const ALL = '__all';

const EMPTY: Filters = {
  from: '',
  to: '',
  actionPrefix: ALL,
  action: ALL,
  actor: '',
  entityId: '',
};

const PAGE_SIZE = 50;

function toQuery(filters: Filters, page?: number): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value.trim() !== '' && value !== ALL) query.set(key, value.trim());
  }

  if (page !== undefined) {
    query.set('page', String(page));
    query.set('limit', String(PAGE_SIZE));
  }

  return query.toString();
}

/** Toshkent vaqti: jurnalni o'qiydigan odam serverning UTC'sini emas, o'z kunini ko'radi. */
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    dateStyle: 'short',
    timeStyle: 'medium',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function pretty(value: unknown): string {
  return value === null || value === undefined ? '—' : JSON.stringify(value, null, 2);
}

/**
 * Audit jurnali (CLAUDE.md §23, `ROADMAP.md` S38).
 *
 * FAQAT O'QISH: bu yerda yozuvni o'zgartiradigan yoki o'chiradigan
 * tugma yo'q va bo'lmaydi. Filtrlar "Qidirish" bosilgandagina
 * qo'llanadi — har bir harf uchun so'rov ketmasin.
 */
export default function AuditPage() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rangeInvalid = draft.from !== '' && draft.to !== '' && draft.from > draft.to;

  const facets = useQuery({
    queryKey: ['audit-facets'],
    queryFn: () => apiFetch<AuditFacets>('/admin/audit/facets'),
  });

  const result = useQuery({
    queryKey: ['audit', toQuery(applied, page)],
    queryFn: () => apiFetch<Paginated<AuditLogEntry>>(`/admin/audit?${toQuery(applied, page)}`),
    placeholderData: keepPreviousData,
  });

  const actions = facets.data?.actions ?? [];
  const prefixes = [...new Set(actions.map((action) => action.split('.')[0] ?? action))].sort();

  const apply = () => {
    if (rangeInvalid) return;
    setApplied(draft);
    setPage(1);
    setOpenId(null);
  };

  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
    setOpenId(null);
  };

  const exportCsv = async () => {
    setBusy(true);
    setError(null);

    try {
      await downloadFile(`/admin/audit/export.csv?${toQuery(applied)}`, 'audit.csv');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };

  const rows = result.data?.items ?? [];
  const meta = result.data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-3">Audit jurnali</h1>
          <p className="lead mt-2">
            Kim, qachon, nimani o‘zgartirgani. Yozuvlar tahrirlanmaydi va o‘chirilmaydi; parol va
            tokenlar jurnalga tushmaydi.
          </p>
        </div>

        <Button variant="secondary" disabled={busy} onClick={() => void exportCsv()}>
          {busy ? 'Yuklanmoqda…' : 'CSV'}
        </Button>
      </div>

      <GlassCard
        as="form"
        className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          apply();
        }}
      >
        <Input
          label="Dan"
          type="date"
          value={draft.from}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })}
        />
        <Input
          label="Gacha"
          type="date"
          value={draft.to}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          error={rangeInvalid ? '«Dan» sanasi «gacha» dan keyin bo‘lmasligi kerak.' : undefined}
        />
        <Select
          label="Soha"
          value={draft.actionPrefix}
          onValueChange={(value) => setDraft({ ...draft, actionPrefix: value })}
          options={[
            { value: ALL, label: 'Hammasi' },
            ...prefixes.map((prefix) => ({ value: prefix, label: prefix })),
          ]}
        />
        <Select
          label="Amal"
          value={draft.action}
          onValueChange={(value) => setDraft({ ...draft, action: value })}
          options={[
            { value: ALL, label: 'Hammasi' },
            ...actions.map((action) => ({ value: action, label: action })),
          ]}
        />
        <Input
          label="Bajaruvchi (email)"
          value={draft.actor}
          onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
        />
        <Input
          label="Obyekt ID"
          value={draft.entityId}
          onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
        />

        <div className="flex items-end gap-2 lg:col-span-2">
          <Button type="submit" disabled={rangeInvalid}>
            Qidirish
          </Button>
          <Button type="button" variant="ghost" onClick={clear}>
            Tozalash
          </Button>
        </div>
      </GlassCard>

      <p className="text-xs text-[var(--color-fg-subtle)]">
        Vaqt Toshkent bo‘yicha (UTC+5). CSV eksporti ham jurnalga yoziladi.
      </p>

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {result.isPending && <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>}

      {result.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Jurnalni yuklab bo‘lmadi.
        </p>
      )}

      {result.data !== undefined &&
        (rows.length === 0 ? (
          <GlassCard className="p-6">
            <p className="text-sm text-[var(--color-fg-muted)]">
              Tanlangan filtrlar bo‘yicha yozuv yo‘q.
            </p>
          </GlassCard>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-line)]">
              <table className="w-full text-sm">
                <caption className="sr-only">Audit jurnali</caption>
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left">
                    {['Vaqt', 'Bajaruvchi', 'Amal', 'Obyekt', ''].map((heading) => (
                      <th
                        key={heading || 'actions'}
                        scope="col"
                        className="px-3 py-2.5 font-medium"
                      >
                        {heading === '' ? <span className="sr-only">Tafsilot</span> : heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const open = openId === row.id;

                    return (
                      <Fragment key={row.id}>
                        <tr className="border-b border-[var(--color-line)] last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                            {formatTime(row.createdAt)}
                          </td>
                          <td className="px-3 py-2">{row.actorEmail ?? '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                          <td className="px-3 py-2">
                            {row.entity}
                            {row.entityId !== null && (
                              <span className="ml-1 font-mono text-xs text-[var(--color-fg-subtle)]">
                                {row.entityId.slice(0, 8)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-expanded={open}
                              aria-controls={`audit-${row.id}`}
                              onClick={() => setOpenId(open ? null : row.id)}
                            >
                              {open ? 'Yopish' : 'Tafsilot'}
                            </Button>
                          </td>
                        </tr>

                        {open && (
                          <tr
                            id={`audit-${row.id}`}
                            className="border-b border-[var(--color-line)]"
                          >
                            <td colSpan={5} className="bg-[var(--color-ink-800)] px-3 py-4">
                              <dl className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <dt className="text-xs text-[var(--color-fg-subtle)]">Oldin</dt>
                                  <dd>
                                    <pre className="mt-1 overflow-x-auto text-xs">
                                      {pretty(row.before)}
                                    </pre>
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-[var(--color-fg-subtle)]">Keyin</dt>
                                  <dd>
                                    <pre className="mt-1 overflow-x-auto text-xs">
                                      {pretty(row.after)}
                                    </pre>
                                  </dd>
                                </div>
                                <div className="md:col-span-2 grid gap-1 text-xs text-[var(--color-fg-muted)]">
                                  <p>Obyekt ID: {row.entityId ?? '—'}</p>
                                  <p>IP: {row.ip ?? '—'}</p>
                                  <p>So‘rov ID: {row.requestId ?? '—'}</p>
                                  <p className="break-all">Brauzer: {row.userAgent ?? '—'}</p>
                                </div>
                              </dl>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta !== undefined && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-fg-subtle)]">Jami {meta.total} ta yozuv</p>
                {meta.totalPages > 1 && (
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={(next: number) => {
                      setPage(next);
                      setOpenId(null);
                    }}
                    labels={{
                      navigation: 'Sahifalash',
                      previous: 'Oldingi sahifa',
                      next: 'Keyingi sahifa',
                      page: (n: number) => `${n}-sahifa`,
                    }}
                  />
                )}
              </div>
            )}
          </>
        ))}
    </div>
  );
}
