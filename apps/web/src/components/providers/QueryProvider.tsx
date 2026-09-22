'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiRequestError } from '@/lib/api-client';

/**
 * TanStack Query provider.
 *
 * `QueryClient` komponent ICHIDA yaratiladi: modul darajasida yaratilsa,
 * serverda barcha so'rovlar uchun bitta umumiy kesh paydo bo'lardi va
 * bir foydalanuvchining ma'lumoti boshqasiga ko'rinib qolishi mumkin edi.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: (failureCount, error) => {
              // 4xx — mijoz xatosi, qayta urinish yordam bermaydi.
              if (error instanceof ApiRequestError && error.statusCode < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
