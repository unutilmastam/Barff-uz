'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '../lib/cn';

export type ToastTone = 'neutral' | 'success' | 'danger';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const TONES: Record<ToastTone, string> = {
  neutral: 'border-[var(--color-line-strong)]',
  success: 'border-[var(--color-success)]',
  danger: 'border-[var(--color-danger)]',
};

interface ToastApi {
  show: (message: Omit<ToastMessage, 'id'> | { title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast <ToastProvider> ichida ishlatilishi kerak');
  }
  return context;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Yopish tugmasining o'qiladigan nomi. */
  closeLabel: string;
}

/**
 * Bildirishnomalar.
 *
 * Radix `role="status"` va `aria-live` ni o'zi qo'yadi, ya'ni xabar
 * ekran o'quvchiga ham yetadi. Muhimi: toast HECH QACHON yagona
 * ma'lumot manbai bo'lmasligi kerak — u o'z-o'zidan yo'qoladi.
 */
export function ToastProvider({ children, closeLabel }: ToastProviderProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback<ToastApi['show']>((message) => {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        title: message.title,
        ...(message.description !== undefined ? { description: message.description } : {}),
        tone: 'tone' in message ? message.tone : 'neutral',
      },
    ]);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={6000}>
        {children}

        {messages.map((message) => (
          <RadixToast.Root
            key={message.id}
            onOpenChange={(open) => {
              if (!open) setMessages((current) => current.filter((m) => m.id !== message.id));
            }}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-[var(--color-ink-800)] p-4 shadow-xl',
              TONES[message.tone],
            )}
          >
            <div className="flex-1">
              <RadixToast.Title className="text-sm font-medium text-[var(--color-fg)]">
                {message.title}
              </RadixToast.Title>
              {message.description !== undefined && (
                <RadixToast.Description className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {message.description}
                </RadixToast.Description>
              )}
            </div>

            <RadixToast.Close
              aria-label={closeLabel}
              className="rounded-md p-1 text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}

        <RadixToast.Viewport className="fixed bottom-0 right-0 z-[100] flex w-[min(24rem,100vw-2rem)] flex-col gap-2 p-4" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
