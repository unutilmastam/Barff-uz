'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type DialogSize = 'md' | 'wide';

const SIZES: Record<DialogSize, string> = {
  md: 'w-[calc(100vw-2rem)] max-w-lg p-6',
  /**
   * Rasm ko'ruvchi uchun: deyarli butun ekran.
   *
   * Ichki bo'shliq kichikroq — bu yerda asosiy narsa rasm, ramka emas.
   */
  wide: 'w-[calc(100vw-1.5rem)] max-w-5xl p-4 sm:p-6',
};

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  /** Sarlavha ostidagi izoh. Ekran o'quvchi uni oynaga bog'lab o'qiydi. */
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Yopish tugmasining o'qiladigan nomi. */
  closeLabel: string;
  size?: DialogSize;
  /** Sarlavhani ko'zdan yashiradi (ekran o'quvchi baribir o'qiydi). */
  hideTitle?: boolean;
}

/**
 * Modal oyna.
 *
 * `title` MAJBURIY: `aria-labelledby` bo'lmasa, ekran o'quvchi oynani
 * nomsiz e'lon qiladi. Fokus tutqichi, `Escape`, skroll blokirovkasi va
 * fokusni qaytarish — Radix zimmasida.
 */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  closeLabel,
  size = 'md',
  hideTitle = false,
}: DialogProps) {
  return (
    <RadixDialog.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
    >
      {trigger !== undefined && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />

        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-ink-800)] shadow-2xl',
            SIZES[size],
          )}
        >
          <RadixDialog.Title
            className={cn(hideTitle ? 'sr-only' : 'text-xl font-semibold tracking-tight')}
          >
            {title}
          </RadixDialog.Title>

          {description !== undefined ? (
            <RadixDialog.Description className="mt-2 text-sm text-[var(--color-fg-muted)]">
              {description}
            </RadixDialog.Description>
          ) : (
            // Tavsif bo'lmasa ham Radix uni kutadi; aks holda konsolga
            // ogohlantirish chiqadi va `aria-describedby` bo'sh qoladi.
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}

          {children !== undefined && <div className={hideTitle ? '' : 'mt-5'}>{children}</div>}

          {footer !== undefined && <div className="mt-6 flex justify-end gap-3">{footer}</div>}

          <RadixDialog.Close
            aria-label={closeLabel}
            className={cn(
              'absolute right-4 top-4 rounded-md p-1.5 text-[var(--color-fg-muted)]',
              'transition-colors hover:bg-[var(--color-glass)] hover:text-[var(--color-fg)]',
            )}
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
