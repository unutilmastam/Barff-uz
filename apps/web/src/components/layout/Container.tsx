import { type ReactNode } from 'react';

/**
 * Kontent kengligini cheklaydi va yon bo'shliqni beradi.
 *
 * Mobilda 16px yon bo'shliq — CLAUDE.md §16 dagi "premium whitespace"
 * mobilda ham kontent chetga yopishib qolmasligini anglatadi.
 */
export function Container({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav';
}) {
  return (
    <Tag className={`mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 ${className}`}>
      {children}
    </Tag>
  );
}
