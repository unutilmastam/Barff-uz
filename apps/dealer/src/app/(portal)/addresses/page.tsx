import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AddressManager } from '@/components/AddressManager';
import { getSession, isActive } from '@/lib/session';

export const metadata: Metadata = { title: 'Manzillar' };
export const dynamic = 'force-dynamic';

/**
 * Yetkazib berish manzillari (CLAUDE.md §5).
 *
 * TASDIQLANMAGAN diler bu yerga kira olmaydi — server ham `403`
 * qaytaradi (`requireActiveDealer`, S22). Bu yo'naltirish shunchaki
 * QULAYLIK: dilerga bo'sh ro'yxat va xato o'rniga o'z ariza holatini
 * ko'rsatadi.
 */
export default async function AddressesPage() {
  const session = await getSession();
  if (!isActive(session)) redirect('/');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Yetkazib berish</p>
        <h1 className="display-3 mt-2">Manzillar</h1>
      </div>

      <AddressManager />
    </div>
  );
}
