import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Kirish' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if ((await getSession()) !== null) redirect('/');

  return (
    <main className="flex min-h-dvh flex-col justify-center p-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-[#0c7830]">BARFF</p>
        <h1 className="mt-2 text-3xl font-bold">Yetkazish</h1>
        <p className="mt-2 text-base text-[#555]">
          Haydovchi uchun. Kirish ma‘lumotlarini logist beradi.
        </p>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
