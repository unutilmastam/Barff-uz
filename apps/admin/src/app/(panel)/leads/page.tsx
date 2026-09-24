'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, GlassCard, Select } from '@barff/ui';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { adminList, toRows } from '@/lib/admin-api';
import {
  BUSINESS_TYPE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
  statusTone,
} from '@/lib/lead-labels';

interface LeadRow {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  region: string;
  businessType: string;
  status: LeadStatus;
  createdAt: string;
}

/**
 * Arizalar ro'yxati (CLAUDE.md §9).
 *
 * Filtr SERVERDA bajariladi: arizalar soni o'sganda mijozda filtrlash
 * butun ro'yxatni yuklashni talab qilardi.
 */
export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const list = useQuery({
    queryKey: ['admin-leads', page, status],
    queryFn: () => adminList<LeadRow>('/admin/leads', { page, limit: 20, status }),
  });

  const { rows, totalPages } = toRows(list.data);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arizalar</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Ommaviy saytdan kelgan B2B hamkorlik arizalari.
        </p>
      </div>

      <GlassCard className="flex flex-col gap-4 p-4">
        <div className="max-w-xs">
          <Select
            label="Holat bo‘yicha filtr"
            value={status}
            onValueChange={(next) => {
              setStatus(next === '__all' ? '' : next);
              // Filtr o'zgarsa birinchi sahifaga qaytamiz: aks holda
              // 5-sahifada turib bo'sh ro'yxat ko'rinardi.
              setPage(1);
            }}
            options={[
              { value: '__all', label: 'Hammasi' },
              ...LEAD_STATUSES.map((code) => ({ value: code, label: LEAD_STATUS_LABELS[code] })),
            ]}
          />
        </div>

        <DataTable
          caption="Arizalar"
          rows={rows}
          rowId={(row) => row.id}
          loading={list.isLoading}
          error={list.isError}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Ariza yo‘q."
          columns={[
            {
              key: 'company',
              header: 'Kompaniya',
              cell: (row) => (
                <Link
                  href={`/leads/${row.id}`}
                  className="underline-offset-4 hover:text-[var(--color-accent-text)] hover:underline"
                >
                  {row.companyName}
                </Link>
              ),
            },
            { key: 'contact', header: 'Kontakt', cell: (row) => row.contactName },
            { key: 'phone', header: 'Telefon', cell: (row) => row.phone },
            { key: 'region', header: 'Hudud', cell: (row) => row.region },
            {
              key: 'type',
              header: 'Turi',
              cell: (row) => BUSINESS_TYPE_LABELS[row.businessType] ?? row.businessType,
            },
            {
              key: 'status',
              header: 'Holat',
              cell: (row) => (
                <Badge tone={statusTone(row.status)}>{LEAD_STATUS_LABELS[row.status]}</Badge>
              ),
            },
            {
              key: 'createdAt',
              header: 'Kelgan sana',
              align: 'end',
              cell: (row) => new Date(row.createdAt).toLocaleDateString('uz-UZ'),
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
