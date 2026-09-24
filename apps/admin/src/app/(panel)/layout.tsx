import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { ThemeToggle } from '@barff/ui';
import { LogoutButton } from '@/components/LogoutButton';
import { Sidebar } from '@/components/Sidebar';
import { QueryProvider } from '@/lib/query';
import { visibleNav } from '@/lib/navigation';
import { getSession } from '@/lib/session';

/**
 * Himoyalangan qism.
 *
 * Sessiya HAR SO'ROVDA serverda tekshiriladi va kesh butunlay
 * o'chirilgan: keshlangan sahifa boshqa foydalanuvchiga ko'rsatilishi
 * mumkin edi.
 *
 * Bu tekshiruv — QULAYLIK qatlami: u foydalanuvchini kirish sahifasiga
 * yo'naltiradi. Ma'lumotning o'zi API'dan keladi va u yerda har bir
 * so'rov alohida avtorizatsiya qilinadi.
 */
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session === null) redirect('/login');

  const groups = visibleNav(session);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="skip-link">
        Asosiy kontentga o‘tish
      </a>

      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-line)] p-4 lg:block">
        <p className="px-3 pb-6 text-lg font-semibold tracking-tight">BARFF</p>
        <Sidebar groups={groups} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.fullName}</p>
            <p className="truncate text-xs text-[var(--color-fg-subtle)]">
              {session.roles.join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/*
              Admin panel kun bo'yi ochiq turadi — yorug' xonada ishlagan
              muharrir uchun ko'rinishni almashtirish ommaviy saytdagidan
              ham kerakroq. Matnlar bu yerda o'zbekcha: panel bir tilda
              (S18).
            */}
            <ThemeToggle
              labels={{
                label: 'Ko‘rinish',
                system: 'Tizim',
                light: 'Yorug‘',
                dark: 'Qorong‘i',
              }}
            />
            <LogoutButton />
          </div>
        </header>

        {/*
          CMS ekranlari ma'lumotni MIJOZDA o'qiydi: tahrirlashdan keyin
          ro'yxat darhol yangilanishi kerak, sahifani qayta yuklamasdan.
        */}
        <main id="main" className="min-w-0 flex-1 p-4 lg:p-8">
          <QueryProvider>{children}</QueryProvider>
        </main>
      </div>
    </div>
  );
}
