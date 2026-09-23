import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Kirish' };

/** Sessiya har so'rovda tekshiriladi — keshlangan javob berib bo'lmaydi. */
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Allaqachon kirgan bo'lsa, kirish sahifasi ko'rsatilmaydi.
  if ((await getSession()) !== null) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium tracking-widest text-[var(--color-brand-400)] uppercase">
          BARFF
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Boshqaruv paneli</h1>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
