import { type AnchorHTMLAttributes, type ElementType, createElement, forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Chiziladigan komponent. Standart — oddiy `<a>`.
   *
   * Next.js ilovalari bu yerga `next/link` ni beradi. Shu tufayli
   * `@barff/ui` Next.js ga BOG'LIQ BO'LMAYDI va uni boshqa muhitda ham
   * ishlatish mumkin.
   */
  as?: ElementType;
  /** Tashqi havola — yangi oynada ochiladi va xavfsiz `rel` qo'yiladi. */
  external?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, as: Component = 'a', external = false, children, ...props },
  ref,
) {
  const externalProps = external
    ? // `noopener` majburiy: busiz ochilgan sahifa `window.opener` orqali
      // bizning sahifamizni boshqa manzilga yo'naltira oladi.
      { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  /*
    `createElement` ATAYLAB ishlatilgan, JSX emas.

    Sabab: `@react-three/fiber` global `JSX.IntrinsicElements` ni
    yuzlab uch o'lchamli element bilan kengaytiradi. Shundan keyin
    polimorf `ElementType` uchun JSX xossalarini hisoblashda TypeScript
    barcha elementlar xossalarining kesishmasini oladi va natija
    `never` bo'lib qoladi. `createElement` bu hisobni chetlab o'tadi,
    komponentning ishlashi esa o'zgarmaydi.
  */
  return createElement(
    Component,
    {
      ref,
      className: cn(
        'rounded-sm underline-offset-4 transition-colors duration-[var(--duration-fast)]',
        'text-[var(--color-fg)] hover:text-[var(--color-accent-text)] hover:underline',
        className,
      ),
      ...externalProps,
      ...props,
    },
    children,
  );
});
