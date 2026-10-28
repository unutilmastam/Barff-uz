import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InvoiceList } from '@/components/InvoiceList';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Hisob-fakturalar' };
export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Moliya</p>
        <h1 className="display-3 mt-2">Hisob-fakturalar</h1>
      </div>

      <InvoiceList />
    </div>
  );
}
