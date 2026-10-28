import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BalanceView } from '@/components/BalanceView';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Balans va to‘lovlar' };
export const dynamic = 'force-dynamic';

export default async function BalancePage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Moliya</p>
        <h1 className="display-3 mt-2">Balans va to‘lovlar</h1>
      </div>

      <BalanceView />
    </div>
  );
}
