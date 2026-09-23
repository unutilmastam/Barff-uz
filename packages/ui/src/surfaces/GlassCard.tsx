import { type ElementType, type HTMLAttributes, createElement } from 'react';
import { cn } from '../lib/cn';

export interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `true` — sichqoncha ostida sal yorishadi (bosiladigan kartalar uchun). */
  interactive?: boolean;
}

/**
 * Shaffof yuza (CLAUDE.md §16).
 *
 * Retsept: juda past shaffoflikdagi oq qatlam + ingichka chegara +
 * blur. Gradient QO'SHILMAYDI — spec "restrained gradients" deydi va
 * shisha effekti o'zi yetarli chuqurlik beradi.
 */
export function GlassCard({
  className,
  as: Component = 'div',
  interactive = false,
  ...props
}: GlassCardProps) {
  /*
  `createElement` ATAYLAB ishlatilgan, JSX emas.

  Sabab: `@react-three/fiber` global `JSX.IntrinsicElements` ni o'zining
  yuzlab uch o'lchamli elementlari bilan kengaytiradi. Shundan keyin
  polimorf `ElementType` uchun JSX xossalarini hisoblashda TypeScript
  barcha elementlar xossalarining kesishmasini oladi va natija `never`
  bo'lib qoladi — ya'ni hech qanday xossa qabul qilinmaydi.

  `createElement` bu hisobni umuman chetlab o'tadi va komponentning
  ishlashi o'zgarmaydi.
*/
  return createElement(Component, {
    className: cn(
      'rounded-xl border border-[var(--color-line)] bg-[var(--color-glass)]',
      'backdrop-blur-md',
      interactive &&
        'transition-colors duration-[var(--duration-base)] hover:border-[var(--color-line-strong)] hover:bg-[color-mix(in_oklab,var(--color-glass)_180%,transparent)]',
      className,
    ),
    ...props,
  });
}
