'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';

/**
 * Chiqish.
 *
 * Server cookie'larni O'ZI tozalaydi va refresh token'ni bekor qiladi —
 * ya'ni chiqish faqat brauzerdagi holat emas, haqiqiy sessiya
 * yakunlanishi.
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void apiFetch('/auth/logout', { method: 'POST' })
          .catch(() => undefined)
          .then(() => {
            router.replace('/login');
            router.refresh();
          });
      }}
      className="min-h-11 rounded-lg border-2 border-[#ccc] px-3 text-sm font-medium"
    >
      {busy ? 'Chiqilmoqda…' : 'Chiqish'}
    </button>
  );
}
