'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { gsap } from '@/lib/gsap';
import { CURSOR, DURATION, EASE } from '@/lib/motion';

/**
 * Kursor holatlari.
 *
 * Elementga `data-cursor="view"` qo'yilsa kursor o'sha holatga o'tadi.
 * Yozuvlar spec'da belgilangan vizual til — brend kontenti emas, shu sababli
 * tarjima qilinmaydi (kursor `aria-hidden`, ekran o'quvchiga ko'rinmaydi).
 */
const CURSOR_LABELS = {
  open: 'OPEN →',
  view: 'VIEW',
  play: 'PLAY',
  drag: 'DRAG ↔',
} as const;

export type CursorState = keyof typeof CURSOR_LABELS;

const isCursorState = (value: string | null): value is CursorState =>
  value !== null && value in CURSOR_LABELS;

/**
 * Maxsus kursor — FAQAT desktop (`hover: hover` va `pointer: fine`).
 *
 * Touch qurilmalarda umuman render qilinmaydi; sichqoncha harakati `quickTo` bilan
 * yumshatiladi, holat esa hover qilingan elementning `data-cursor` atributidan olinadi.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    const label = labelRef.current;
    if (!root || !label) return;
    if (prefersReducedMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const context = gsap.context(() => {
      const moveX = gsap.quickTo(root, 'x', { duration: CURSOR.followDuration, ease: EASE.out3 });
      const moveY = gsap.quickTo(root, 'y', { duration: CURSOR.followDuration, ease: EASE.out3 });

      let currentState: CursorState | null = null;

      const applyState = (state: CursorState | null) => {
        if (state === currentState) return;
        currentState = state;

        label.textContent = state ? CURSOR_LABELS[state] : '';
        gsap.to(root, {
          width: state ? CURSOR.activeSize : CURSOR.size,
          height: state ? CURSOR.activeSize : CURSOR.size,
          duration: DURATION.micro,
          ease: EASE.out3,
        });
      };

      const onMove = (event: MouseEvent) => {
        moveX(event.clientX);
        moveY(event.clientY);

        const target = event.target as Element | null;
        const holder = target?.closest?.('[data-cursor]') ?? null;
        const state = holder?.getAttribute('data-cursor') ?? null;
        applyState(isCursorState(state) ? state : null);
      };

      const onLeaveWindow = () => gsap.to(root, { opacity: 0, duration: DURATION.micro });
      const onEnterWindow = () => gsap.to(root, { opacity: 1, duration: DURATION.micro });

      gsap.set(root, { xPercent: -50, yPercent: -50, width: CURSOR.size, height: CURSOR.size });

      // Tizim kursorini yashirish signali — faqat shu yerga yetib kelinganda.
      document.documentElement.dataset.customCursor = 'on';

      window.addEventListener('mousemove', onMove);
      document.addEventListener('mouseleave', onLeaveWindow);
      document.addEventListener('mouseenter', onEnterWindow);

      return () => {
        delete document.documentElement.dataset.customCursor;
        window.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseleave', onLeaveWindow);
        document.removeEventListener('mouseenter', onEnterWindow);
      };
    }, root);

    return () => context.revert();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-cursor-root
      className="bg-foreground pointer-events-none fixed top-0 left-0 z-[250] hidden items-center justify-center rounded-full pointer-fine:flex"
    >
      <span
        ref={labelRef}
        className="text-background text-[0.625rem] font-medium tracking-[0.08em] whitespace-nowrap"
      />
    </div>
  );
}
