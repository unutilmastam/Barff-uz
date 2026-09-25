import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrderDetailView } from '@/components/OrderDetailView';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Buyurtma' };
export const dynamic = 'force-dynamic';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  const { id } = await params;
  const query = await searchParams;

  // `?yangi=1` — yuborishdan keyin tasdiq xabarini ko'rsatish uchun.
  return <OrderDetailView id={id} justCreated={query['yangi'] === '1'} />;
}
