'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SheetSide = 'left' | 'right';

const SIDES: Record<SheetSide, string> = {
  left: 'left-0 top-0 h-dvh w-[min(22rem,85vw)] border-r',
  right: 'right-0 top-0 h-dvh w-[min(22rem,85vw)] border-l',
};

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  side?: SheetSide;
  children?: ReactNode;
  closeLabel: string;
}

/**
 * Yon panel — mobil menyu uchun.
 *
 * Dialog ustiga qurilgan, chunki xulqi bir xil: fokus ichida ushlanadi,
 * `Escape` yopadi, orqa fon skroll qilinmaydi. Farqi faqat joylashuvda.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  side = 'right',
  children,
  closeLabel,
}: SheetProps) {
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
            'fixed z-50 border-[var(--color-line-strong)] bg-[var(--color-ink-800)] p-6 shadow-2xl',
            SIDES[side],
          )}
        >
          <RadixDialog.Title className="text-lg font-semibold tracking-tight">
            {title}
          </RadixDialog.Title>

          {description !== undefined ? (
            <RadixDialog.Description className="mt-1.5 text-sm text-[var(--color-fg-muted)]">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}

          <div className="mt-6">{children}</div>

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
