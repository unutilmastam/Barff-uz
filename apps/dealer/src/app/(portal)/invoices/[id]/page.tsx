import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InvoiceDetail } from '@/components/InvoiceDetail';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Hisob-faktura' };
export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <InvoiceDetail id={id} />
    </div>
  );
}
