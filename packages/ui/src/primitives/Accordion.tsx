'use client';

import * as RadixAccordion from '@radix-ui/react-accordion';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface AccordionItem {
  value: string;
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** `single` — bir vaqtda bitta ochiq; `multiple` — bir nechtasi. */
  mode?: 'single' | 'multiple';
  className?: string;
}

/** Yig'iladigan bo'limlar (FAQ, mahsulot tafsilotlari uchun). */
export function Accordion({ items, mode = 'single', className }: AccordionProps) {
  const common = {
    className: cn(
      'divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]',
      className,
    ),
  };

  const content = items.map((item) => (
    <RadixAccordion.Item key={item.value} value={item.value}>
      <RadixAccordion.Header>
        <RadixAccordion.Trigger
          className={cn(
            'group flex w-full items-center justify-between gap-4 py-4 text-left',
            'text-base font-medium text-[var(--color-fg)] transition-colors',
            'hover:text-[var(--color-brand-400)]',
          )}
        >
          {item.title}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-4 shrink-0 opacity-60 transition-transform duration-[var(--duration-fast)] group-data-[state=open]:rotate-180"
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>

      <RadixAccordion.Content className="pb-4 text-sm text-[var(--color-fg-muted)]">
        {item.content}
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  ));

  return mode === 'single' ? (
    <RadixAccordion.Root type="single" collapsible {...common}>
      {content}
    </RadixAccordion.Root>
  ) : (
    <RadixAccordion.Root type="multiple" {...common}>
      {content}
    </RadixAccordion.Root>
  );
}
