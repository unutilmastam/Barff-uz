import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CartView } from '@/components/CartView';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Savat' };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Savdo</p>
        <h1 className="display-3 mt-2">Savat</h1>
      </div>

      <CartView />
    </div>
  );
}
