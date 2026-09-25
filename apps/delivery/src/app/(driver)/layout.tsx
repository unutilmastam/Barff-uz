import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import { ServiceWorker } from '@/components/ServiceWorker';
import { LogoutButton } from '@/components/LogoutButton';
import { getSession, isDriver } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Haydovchi qobig'i.
 *
 * MENYU YO'Q. Haydovchida ikkita ekran bor — ro'yxat va
 * tafsilot — va ularning orasida "orqaga" strelkasi yetarli.
 * Menyu ekranning tepasidan joy olardi, telefonda esa har bir
 * qator bir yetkazma degani.
 */
export default async function DriverLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (session === null) redirect('/login');

  return (
    <Providers>
      <ServiceWorker />

      <header className="flex items-center justify-between border-b-2 border-[#eee] px-4 py-3">
        <span className="text-base font-bold text-[#0c7830]">BARFF</span>
        <div className="flex items-center gap-3">
          <span className="max-w-40 truncate text-sm text-[#555]">{session.fullName}</span>
          <LogoutButton />
        </div>
      </header>

      {/*
        HAYDOVCHI PROFILI YO'Q BO'LSA SABAB KO'RINADI.

        `DRIVER` roli bor foydalanuvchida profil bo'lmasligi
        mumkin (S32) — o'shanda yetkazmalar so'rovi `403` beradi.
        Bo'sh ekran "ilova buzilgan" deb tushunilardi.
      */}
      {!isDriver(session) ? (
        <main className="p-4">
          <p className="text-lg">
            Sizda haydovchi profili yo‘q. Logistga murojaat qiling — u profilni ochib beradi.
          </p>
        </main>
      ) : (
        <main>{children}</main>
      )}
    </Providers>
  );
}
