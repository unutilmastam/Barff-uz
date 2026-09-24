'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@barff/ui';
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
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
          // Xato bo'lsa ham kirish sahifasiga o'tiladi: foydalanuvchi
          // "chiqdim" deb o'ylab, aslida ichkarida qolib ketmasin.
          router.replace('/login');
          router.refresh();
        }
      }}
    >
      Chiqish
    </Button>
  );
}
