'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

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
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-ink-800)] p-6 shadow-2xl',
          )}
        >
          <RadixDialog.Title className="text-xl font-semibold tracking-tight">
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

          {children !== undefined && <div className="mt-5">{children}</div>}

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
