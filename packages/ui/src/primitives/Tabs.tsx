'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  defaultValue?: string;
  /** Tab ro'yxatining o'qiladigan nomi — bir sahifada bir nechtasi bo'lsa kerak. */
  label: string;
  className?: string;
}

/**
 * Tablar.
 *
 * Radix `role="tablist"`, o'q tugmalari bilan yurish va `aria-selected`
 * ni o'zi boshqaradi — qo'lbola variantda bular odatda unutiladi.
 */
export function Tabs({ items, defaultValue, label, className }: TabsProps) {
  const resolvedDefault = defaultValue ?? items[0]?.value;

  return (
    <RadixTabs.Root
      {...(resolvedDefault !== undefined ? { defaultValue: resolvedDefault } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      <RadixTabs.List aria-label={label} className="flex gap-1 border-b border-[var(--color-line)]">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
              'data-[state=active]:text-[var(--color-fg)]',
              // Faol tab ostidagi chiziq — rang YAGONA belgi bo'lib qolmasligi
              // uchun qo'shimcha vizual ishora.
              'after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-transparent',
              'data-[state=active]:after:bg-[var(--color-brand-500)]',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="pt-6">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
