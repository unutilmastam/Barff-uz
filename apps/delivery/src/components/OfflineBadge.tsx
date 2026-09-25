'use client';

import { useEffect, useState } from 'react';

/**
 * Aloqa holati.
 *
 * `navigator.onLine` YOLG'ON GAPIRISHI MUMKIN: u faqat tarmoq
 * interfeysi borligini biladi, internet borligini emas (Wi-Fi ga
 * ulangan, lekin chiqish yo'q). Shuning uchun u FAQAT "aniq
 * oflayn" holatini ko'rsatish uchun ishlatiladi — "onlayn" degan
 * da'vo qilinmaydi.
 *
 * Haqiqiy tekshiruv — so'rovning o'zi.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

export function OfflineBadge({ pending }: { pending: number }) {
  const online = useOnline();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className={`sticky top-0 z-20 px-4 py-2 text-center text-sm font-medium ${
        online ? 'bg-[#fff4d6] text-[#7a5200]' : 'bg-[#ffe0e0] text-[#8a1f1f]'
      }`}
    >
      {online
        ? `${pending} ta amal yuborilmoqda…`
        : pending > 0
          ? `Aloqa yo‘q — ${pending} ta amal navbatda`
          : 'Aloqa yo‘q'}
    </div>
  );
}
