'use client';

import Link from 'next/link';
import { REPORTS } from '@barff/types';
import { GlassCard } from '@barff/ui';

/**
 * Hisobotlar ro'yxati (CLAUDE.md §22, `ROADMAP.md` S37).
 *
 * Ro'yxat `@barff/types` dagi YAGONA manbadan keladi: API ham,
 * bu ekran ham bir xil hisobotlar va filtrlarni ko'radi.
 */
export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-3">Hisobotlar</h1>
        <p className="lead mt-2">
          Raqamlar manba jadvallardan to‘g‘ridan-to‘g‘ri hisoblanadi — oraliq nusxa yo‘q.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <li key={report.key}>
            <Link
              href={`/reports/${report.key}`}
              className="block h-full rounded-[var(--radius-card,1.5rem)] focus-visible:outline-2"
            >
              <GlassCard className="h-full p-5 transition-colors hover:border-[var(--color-fg-subtle)]">
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{report.description}</p>
              </GlassCard>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
