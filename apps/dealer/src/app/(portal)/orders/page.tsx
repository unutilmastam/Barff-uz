import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrderList } from '@/components/OrderList';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Buyurtmalar' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Savdo</p>
        <h1 className="display-3 mt-2">Buyurtmalar</h1>
      </div>

      <OrderList />
    </div>
  );
}
