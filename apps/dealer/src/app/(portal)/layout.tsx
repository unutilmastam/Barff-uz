import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { ThemeToggle } from '@barff/ui';
import { LogoutButton } from '@/components/LogoutButton';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';
import { QueryProvider } from '@/lib/query';
import { visibleNav } from '@/lib/navigation';
import { getSession, isActive } from '@/lib/session';

/**
 * Himoyalangan qism.
 *
 * Sessiya HAR SO'ROVDA serverda tekshiriladi va kesh butunlay
 * o'chirilgan: keshlangan sahifa boshqa dilerga ko'rsatilishi mumkin
 * edi — va u yerda NARXLAR bor.
 *
 * Bu tekshiruv QULAYLIK qatlami: u foydalanuvchini kirish sahifasiga
 * yo'naltiradi. Ma'lumotning o'zi API'dan keladi va u yerda har bir
 * so'rov alohida avtorizatsiya qilinadi (`requireActiveDealer`).
 */
export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session === null) redirect('/login');

  const groups = visibleNav(isActive(session));

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a href="#main" className="skip-link">
        Asosiy kontentga o‘tish
      </a>

      {/*
        MOBIL BIRINCHI: dilerlar TELEFONDAN buyurtma beradi
        (`ROADMAP.md` S24). Shuning uchun yon menyu faqat katta
        ekranda; kichigida u sahifa boshidagi gorizontal menyuga
        aylanadi va asosiy kontent tepada qoladi.
      */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-line)] p-4 lg:block">
        <p className="px-3 pb-6 text-lg font-semibold tracking-tight">BARFF</p>
        <Sidebar groups={groups} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {session.dealer?.companyName ?? session.fullName}
            </p>
            <p className="truncate text-xs text-[var(--color-fg-subtle)]">{session.email}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
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

        <MobileNav groups={groups} />

        <main id="main" className="min-w-0 flex-1 p-4 lg:p-8">
          <QueryProvider>{children}</QueryProvider>
        </main>
      </div>
    </div>
  );
}
