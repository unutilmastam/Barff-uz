'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { REPORTS, type Paginated, type ReportFilter, type ReportResult } from '@barff/types';
import { Button, GlassCard, Input, Select } from '@barff/ui';
import { apiFetch } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { formatCell, isNumeric, labelFor } from '@/lib/report-format';

interface Option {
  id: string;
  label: string;
}

function localizedName(value: unknown): string {
  if (typeof value === 'string') return value;
  const names = (value ?? {}) as { uz?: string; ru?: string; en?: string };

  return names.uz ?? names.ru ?? names.en ?? '—';
}

/**
 * Hisobot ko'rinishi (`ROADMAP.md` S37).
 *
 * FILTRLAR HISOBOTGA QARAB CHIQADI. Hisobotga tegishli bo'lmagan
 * filtr ekranda umuman ko'rinmaydi — server uni `400` bilan rad
 * etadi (`REPORT_FILTER_UNSUPPORTED`), jim e'tiborsiz qoldirmaydi.
 * Ko'rsatib qo'yib e'tiborsiz qoldirish foydalanuvchiga filtr
 * ishlayapti degan taassurot berardi.
 */
export default function ReportPage() {
  const params = useParams<{ key: string }>();
  const definition = REPORTS.find((report) => report.key === params.key);

  if (definition === undefined) notFound();

  const supports = (filter: ReportFilter) =>
    (definition.filters as readonly ReportFilter[]).includes(filter);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [region, setRegion] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [productId, setProductId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const dealers = useQuery({
    enabled: supports('dealerId'),
    queryKey: ['report-dealers'],
    queryFn: () => apiFetch<{ id: string; companyName: string }[]>('/admin/orders/dealers'),
  });

  const products = useQuery({
    enabled: supports('productId'),
    queryKey: ['report-products'],
    queryFn: () => apiFetch<Paginated<{ id: string; name: unknown }>>('/admin/products?limit=100'),
  });

  const query = new URLSearchParams();
  if (supports('from') && from !== '') query.set('from', from);
  if (supports('to') && to !== '') query.set('to', to);
  if (supports('region') && region.trim() !== '') query.set('region', region.trim());
  if (supports('dealerId') && dealerId !== '') query.set('dealerId', dealerId);
  if (supports('productId') && productId !== '') query.set('productId', productId);

  const rangeInvalid = from !== '' && to !== '' && from > to;

  const result = useQuery({
    enabled: !rangeInvalid,
    queryKey: ['report', params.key, query.toString()],
    queryFn: () => apiFetch<ReportResult>(`/reports/${params.key}?${query.toString()}`),
  });

  const dealerOptions: Option[] = (dealers.data ?? []).map((d) => ({
    id: d.id,
    label: d.companyName,
  }));
  const productOptions: Option[] = (products.data?.items ?? []).map((p) => ({
    id: p.id,
    label: localizedName(p.name),
  }));

  const download = async (format: 'csv' | 'xlsx') => {
    setBusy(format);
    setError(null);

    try {
      await downloadFile(
        `/reports/${params.key}/export.${format}?${query.toString()}`,
        `${params.key}.${format}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi.');
    } finally {
      setBusy(null);
    }
  };

  const data = result.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <Link href="/reports" className="text-sm underline-offset-4 hover:underline">
          ← Hisobotlar
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-3">{definition.title}</h1>
          <p className="lead mt-2">{definition.description}</p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy !== null} onClick={() => void download('csv')}>
            {busy === 'csv' ? 'Yuklanmoqda…' : 'CSV'}
          </Button>
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => void download('xlsx')}
          >
            {busy === 'xlsx' ? 'Yuklanmoqda…' : 'XLSX'}
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Chop etish
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: #fff; }
          aside, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      <GlassCard className="no-print grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {supports('from') && (
          <Input label="Dan" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        )}
        {supports('to') && (
          <Input
            label="Gacha"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            error={rangeInvalid ? '«Dan» sanasi «gacha» dan keyin bo‘lmasligi kerak.' : undefined}
          />
        )}
        {supports('region') && (
          <Input label="Hudud" value={region} onChange={(e) => setRegion(e.target.value)} />
        )}
        {supports('dealerId') && (
          <Select
            label="Diler"
            value={dealerId}
            onValueChange={setDealerId}
            options={[
              { value: '', label: 'Hammasi' },
              ...dealerOptions.map((o) => ({ value: o.id, label: o.label })),
            ]}
          />
        )}
        {supports('productId') && (
          <Select
            label="Mahsulot"
            value={productId}
            onValueChange={setProductId}
            options={[
              { value: '', label: 'Hammasi' },
              ...productOptions.map((o) => ({ value: o.id, label: o.label })),
            ]}
          />
        )}

        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom('');
              setTo('');
              setRegion('');
              setDealerId('');
              setProductId('');
            }}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </GlassCard>

      {supports('from') && (
        <p className="no-print text-xs text-[var(--color-fg-subtle)]">
          Kunlar Toshkent vaqti bilan (UTC+5). Pul qiymatlari ekranda so‘mda, eksportda tiyinda.
        </p>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {result.isPending && !rangeInvalid && (
        <p className="text-sm text-[var(--color-fg-subtle)]">Yuklanmoqda…</p>
      )}

      {result.isError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Hisobotni yuklab bo‘lmadi.
        </p>
      )}

      {data !== undefined && (
        <>
          {data.truncated && (
            <GlassCard className="border-[var(--color-warning)] p-4">
              <p className="text-sm">
                <strong>Faqat dastlabki {data.rowLimit} qator ko‘rsatilmoqda.</strong> Jami
                qiymatlar butun tanlov bo‘yicha. To‘liq ro‘yxat uchun CSV yuklab oling — u
                cheklanmagan.
              </p>
            </GlassCard>
          )}

          {data.rows.length === 0 ? (
            <GlassCard className="p-6">
              <p className="text-sm text-[var(--color-fg-muted)]">
                Tanlangan filtrlar bo‘yicha ma‘lumot yo‘q.
              </p>
            </GlassCard>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-line)]">
              <table className="w-full text-sm">
                <caption className="sr-only">{definition.title}</caption>
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left">
                    {data.columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={`px-3 py-2.5 font-medium ${isNumeric(column.type) ? 'text-right' : ''}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={index} className="border-b border-[var(--color-line)] last:border-0">
                      {data.columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-3 py-2 ${isNumeric(column.type) ? 'text-right tabular-nums' : ''}`}
                        >
                          {labelFor(column.key, row[column.key] ?? null) ??
                            formatCell(column.type, row[column.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(data.totals).length > 0 && (
            <GlassCard className="p-5">
              <h2 className="text-sm font-medium">Jami</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(data.totals).map(([key, value]) => {
                  const column = data.columns.find((c) => c.key === key);

                  return (
                    <div key={key}>
                      <dt className="text-xs text-[var(--color-fg-subtle)]">
                        {column?.label ?? TOTAL_LABELS[key] ?? key}
                      </dt>
                      <dd className="mt-0.5 tabular-nums">
                        {formatCell(column?.type ?? 'integer', value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}

/** Jami qatorida bor, lekin jadval ustuni bo'lmagan ko'rsatkichlar. */
const TOTAL_LABELS: Record<string, string> = {
  movements: 'Harakatlar',
  inbound: 'Kirim',
  outbound: 'Chiqim',
  leads: 'Arizalar',
  converted: 'Diler bo‘ldi',
  conversionRate: 'Konversiya (%)',
  deliveries: 'Yetkazmalar',
  delivered: 'Topshirilgan',
  failed: 'Bajarilmagan',
};
