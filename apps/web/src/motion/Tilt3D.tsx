'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { TILT } from './config';
import { useMotionEnabled } from './useMotionEnabled';

export interface Tilt3DProps {
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Sichqoncha ortidan 3D qiyalik + yaltiroq akslanish.
 *
 * Kartochka sichqoncha tomonga biroz buriladi, ichidagi `data-tilt-lift`
 * elementlar (shisha) esa kartochkadan "ko'tarilib" chiqadi va
 * yorug'lik dog'i (glare) kursor ortidan yuradi.
 *
 * HODISALAR QAYERDA TINGLANADI: kartochka sarlavhasi `after:absolute
 * after:inset-0` bilan BUTUN kartani qoplaydi (ProductCard) — shuning
 * uchun sichqoncha hodisasi shu element ustiga emas, havola ustiga
 * tushadi. Shu sababli eng yaqin `[data-tilt-host]` ota-elementga
 * ulanadi, yo'q bo'lsa o'zining ustiga.
 *
 * FAQAT sichqonchali qurilmada va harakat yoqilganda: telefonda hover
 * yo'q, `prefers-reduced-motion` da esa kartochka qimirlamaydi.
 */
export function Tilt3D({ children, className }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const el = ref.current;
    if (!enabled || el === null) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    const host = el.closest<HTMLElement>('[data-tilt-host]') ?? el;

    let raf = 0;
    const goal = { rx: 0, ry: 0 };
    const now = { rx: 0, ry: 0 };

    const frame = () => {
      now.rx += (goal.rx - now.rx) * TILT.follow;
      now.ry += (goal.ry - now.ry) * TILT.follow;
      el.style.transform = `perspective(900px) rotateX(${now.rx.toFixed(2)}deg) rotateY(${now.ry.toFixed(2)}deg)`;

      const settled = Math.abs(goal.rx - now.rx) < 0.02 && Math.abs(goal.ry - now.ry) < 0.02;
      raf = settled ? 0 : requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf === 0) raf = requestAnimationFrame(frame);
    };

    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;

      goal.ry = (px - 0.5) * 2 * TILT.maxDegrees;
      goal.rx = -(py - 0.5) * 2 * TILT.maxDegrees;

      el.style.setProperty('--tilt-lift', `${TILT.lift}px`);
      el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-o', '1');
      kick();
    };

    const leave = () => {
      goal.rx = 0;
      goal.ry = 0;
      el.style.setProperty('--tilt-lift', '0px');
      el.style.setProperty('--glare-o', '0');
      kick();
    };

    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);

    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };
  }, [enabled]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: 'preserve-3d' }}>
      {children}
      {/* Yorug'lik dog'i: kursor ostida, mahsulot rangiga aralashmaydi. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: 'var(--glare-o, 0)',
          background:
            'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.28), transparent 45%)',
          mixBlendMode: 'soft-light',
        }}
      />
    </div>
  );
}
