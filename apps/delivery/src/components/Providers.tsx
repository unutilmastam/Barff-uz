'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * So'rovlar mijozi.
 *
 * `retry: 1` — tarmoqsiz joyda uzoq qayta urinish ekranni
 * muzlatib qo'yardi. Oflayn holat DARHOL ko'rinishi kerak:
 * haydovchi "yuklanmoqda" ni emas, "oflayn" ni ko'rishi kerak.
 *
 * `staleTime` past — ro'yxat tez eskiradi (logist ishni qayta
 * biriktirishi mumkin).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
