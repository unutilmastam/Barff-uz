'use client';

import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  /*
    Asosiy amal: yashil fon, qora matn.

    Matn rangi `accent-on` — u IKKALA ko'rinishda ham qora, chunki
    yashil (`#16b45f`) o'rta to'qlikda va oq matn unda atigi 2.72:1
    beradi. Ya'ni bu yerda `ink-900` ISHLAMAYDI: yorug' ko'rinishda u
    deyarli oqqa aylanadi va tugma o'qilmay qolardi.
  */
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-on)] hover:bg-[var(--color-accent-hover)]',
  // Ikkilamchi: ingichka chegara, shaffof fon (CLAUDE.md §16).
  secondary:
    'border border-[var(--color-line-strong)] text-[var(--color-fg)] hover:bg-[var(--color-glass)]',
  ghost: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-glass)] hover:text-[var(--color-fg)]',
  /*
    Xavfli amal.

    Matn rangi ko'rinishga QARAB o'zgaradi (`danger-on`): qorong'ida
    fon ochiq qizil (`#d94b3f`) va matn qora bo'ladi, yorug'da esa fon
    to'q qizil (`#c0392b`) va matn oq. Bitta rang ikkalasida ham AA
    dan o'ta olmasdi — qorong'idagi oq matn atigi 3.85:1 berardi.
  */
  danger: 'bg-[var(--color-danger)] text-[var(--color-danger-on)] hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  // Balandliklar teginish maydoni uchun: mobilda kamida 44px tavsiya
  // etiladi, shuning uchun `md` va `lg` shu chegaradan past emas.
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * `true` bo'lsa, o'zining `<button>` ini chizmasdan uslublarni bolaga
   * beradi. Havolani tugma ko'rinishida ko'rsatish uchun kerak — bunda
   * `<a>` `<a>` bo'lib qoladi va klaviatura xulqi to'g'ri bo'ladi.
   */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild = false, type, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      // `<button>` ning standart turi `submit` — forma ichida tasodifan
      // yuborib yuborishning eng keng tarqalgan sababi shu.
      {...(asChild ? {} : { type: type ?? 'button' })}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
