import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/RegisterForm';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Hamkor bo‘lish',
  // Portal qidiruvga tushmaydi (S24) — bu sahifa ham.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  // Kirgan foydalanuvchiga ariza formasi kerak emas.
  if ((await getSession()) !== null) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-lg py-10">
        <p className="eyebrow">BARFF</p>
        <h1 className="display-3 mt-2">Hamkor bo‘lish</h1>
        <p className="lead mt-3">
          Ariza bilan birga kirish akkaunti yaratiladi — holatni o‘zingiz kuzatasiz.
        </p>

        <div className="mt-8">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
          Akkauntingiz bormi?{' '}
          <Link
            href="/login"
            className="text-[var(--color-accent-text)] underline-offset-4 hover:underline"
          >
            Kirish
          </Link>
        </p>
      </div>
    </main>
  );
}
