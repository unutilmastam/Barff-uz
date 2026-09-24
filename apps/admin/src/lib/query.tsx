'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * TanStack Query provayderi.
 *
 * `useState` ichida yaratiladi: modul darajasidagi yagona klient
 * SERVERDA foydalanuvchilar o'rtasida bo'lishilib ketardi va bir
 * kishining ma'lumoti boshqasiga ko'rinishi mumkin edi.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Admin panelda ma'lumot tez eskiradi: kimdir boshqa
            // oynada tahrirlagan bo'lishi mumkin.
            staleTime: 10_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
