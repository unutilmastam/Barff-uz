import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn, isExternalHref } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium uppercase ' +
  'tracking-[0.06em] whitespace-nowrap transition-[background-color,color,border-color,opacity] ' +
  'duration-[--duration-micro] ease-[--ease-out-power2] disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-85',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-line',
  outline: 'border border-line text-foreground hover:border-foreground',
  ghost: 'text-foreground hover:bg-secondary',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[0.75rem]',
  md: 'h-12 px-6 text-[0.8125rem]',
  lg: 'h-14 px-8 text-[0.875rem]',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Yagona tugma komponenti.
 * `href` berilsa — havola (ichki bo'lsa `next/link`), aks holda `<button>`.
 * Semantika to'g'ri bo'lishi uchun div yoki span ishlatilmaydi.
 */
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as ButtonAsLink;

    if (isExternalHref(href)) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonAsButton;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
