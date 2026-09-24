import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Mahsulotlar va narxlar' };
export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Savdo</p>
        <h1 className="display-3 mt-2">Mahsulotlar va narxlar</h1>
        <p className="lead mt-3">
          Narxlar sizning shartlaringizga ko‘ra hisoblangan. Miqdorga bog‘liq chegirma savatda
          qo‘llanadi.
        </p>
      </div>

      <CatalogBrowser />
    </div>
  );
}
