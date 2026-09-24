import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Kirish' };

/** Sessiya har so'rovda tekshiriladi — keshlangan javob berib bo'lmaydi. */
export const dynamic = 'force-dynamic';

/** Ommaviy saytdagi ariza formasi — hali diler bo'lmaganlar uchun. */
function siteUrl(): string {
  const url = process.env['NEXT_PUBLIC_SITE_URL'];

  return url !== undefined && url.length > 0 ? url : 'http://localhost:3001';
}

export default async function LoginPage() {
  // Allaqachon kirgan bo'lsa, kirish sahifasi ko'rsatilmaydi.
  if ((await getSession()) !== null) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow">BARFF</p>
        <h1 className="display-3 mt-2">Hamkor portali</h1>

        <div className="mt-8">
          <LoginForm />
        </div>

        {/*
          Hali diler bo'lmagan odam ham shu sahifaga tushadi. Uni
          "parolingiz noto'g'ri" bilan qoldirish o'rniga ariza
          formasiga yo'naltiramiz (S22).

          IKKI YO'L ATAYLAB: portaldagi ariza AKKAUNT yaratadi va
          ariza egasi holatini o'zi kuzatadi; ommaviy saytdagi forma
          esa anonim lead qoldiradi va uni sotuvchi yuritadi (S14).
          Kim darhol buyurtma bermoqchi bo'lsa — birinchisi.
        */}
        <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
          Hali hamkor emasmisiz?{' '}
          <Link
            href="/register"
            className="text-[var(--color-accent-text)] underline-offset-4 hover:underline"
          >
            Ariza yuborish
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-[var(--color-fg-subtle)]">
          Yoki{' '}
          <Link
            href={`${siteUrl()}/uz/become-partner`}
            className="underline-offset-4 hover:underline"
          >
            saytdagi qisqa ariza
          </Link>{' '}
          orqali bog‘laning.
        </p>
      </div>
    </main>
  );
}
