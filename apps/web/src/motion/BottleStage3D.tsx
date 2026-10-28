'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { placeItem, snapIndex, toStyle, wrapOffset } from './carousel';
import { STAGE } from './config';
import { useMotionEnabled } from './useMotionEnabled';

/**
 * BARFF shishalarining 3D sahnasi (hero).
 *
 * ================== NIMA CHIZILADI ==================
 *
 * BARFF'ning HAQIQIY fotosuratlari (fonsiz kesilgan, `lib/cutouts.ts`) —
 * o'ylab topilgan shakl EMAS. Ular CSS 3D (perspektiva, `translateZ`,
 * `rotateY`) bilan aylana bo'ylab turadi: oldidagisi katta va yorqin,
 * orqadagilari kichik, xira va qorong'i. WebGL kerak emas, shuning
 * uchun hamma qurilmada ishlaydi va tasvirlar oddiy `<img>` — ekran
 * o'quvchi va qidiruv tizimi ularni ko'radi.
 *
 * Har bir shisha ostida SIRPANCHIQ yuzaga aks, soya va ORQA YORUG'LIK
 * (mahsulot rangidan; faqat bezak — matn rangi emas, CLAUDE.md §16).
 *
 * ================== BOSHQARUV ==================
 *
 * - sichqoncha/barmoq bilan SUDRASH (vertikal skroll buzilmaydi);
 * - ◀ ▶ tugmalar va `←` `→` klavishlari;
 * - oldidagi shishani bosish — mahsulot sahifasiga; qo'shnisini bosish —
 *   uni oldinga olib keladi;
 * - sichqoncha harakati sahnani biroz buradi (faqat sichqonchali qurilmada);
 * - avtomatik aylanish: sahna ko'rinib turganda va sichqoncha/fokus
 *   ustida bo'lmaganda.
 *
 * ================== HARAKAT O'CHIQ BO'LSA ==================
 *
 * `prefers-reduced-motion` yoki kuchsiz qurilmada: avtomatik aylanish va
 * yumshoq o'tish YO'Q (shisha bir zumda almashadi), lekin hamma narsa
 * boshqariladi va ko'rinadi (CLAUDE.md §17: animatsiya kontentga
 * yetishning yagona yo'li bo'lmaydi).
 *
 * ================== IMPERATIV YANGILANISH ==================
 *
 * Har kadrdagi transformlar React holati orqali EMAS, to'g'ridan-to'g'ri
 * elementlarga yoziladi: kadrda 8 ta elementni qayta chizish React'ni
 * bekorga band qilardi. React faqat kamdan-kam o'zgaradigan narsani
 * (oldidagi shisha nomi) biladi. Boshlang'ich holat serverda ham xuddi
 * shu funksiyadan chiqadi — gidratsiyada farq yo'q.
 */
export interface StageItem {
  slug: string;
  name: string;
  href: string;
  src: string;
  width: number;
  height: number;
  glow: string;
}

export interface StageLabels {
  region: string;
  prev: string;
  next: string;
  open: string;
  /** `{n}` va `{total}` joylari bilan, masalan "{n} / {total}". */
  counter: string;
}

const DEFAULT_RADIUS = 300;

export function BottleStage3D({ items, labels }: { items: StageItem[]; labels: StageLabels }) {
  const count = items.length;
  const enabled = useMotionEnabled();

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [active, setActive] = useState(0);

  const motion = useRef({
    current: 0,
    target: 0,
    radius: DEFAULT_RADIUS,
    raf: 0,
    enabled: false,
    paused: false,
    inView: true,
    dragging: false,
    moved: 0,
    activeIndex: 0,
    entered: false,
  });

  const render = useCallback(() => {
    const m = motion.current;

    for (let i = 0; i < count; i += 1) {
      const offset = wrapOffset(i, m.current, count);
      const placement = placeItem(offset, count, m.radius);
      const style = toStyle(placement);
      const el = itemRefs.current[i];

      if (el !== null && el !== undefined) {
        el.style.transform = `translateX(-50%) ${style.transform}`;
        el.style.opacity = String(style.opacity);
        el.style.filter = style.filter;
        el.style.zIndex = String(style.zIndex);
      }

      const glow = glowRefs.current[i];
      if (glow !== null && glow !== undefined) glow.style.opacity = placement.glow.toFixed(3);
    }

    const next = snapIndex(m.current, count);
    if (next !== m.activeIndex) {
      m.activeIndex = next;
      setActive(next);
    }
  }, [count]);

  const tick = useCallback(() => {
    const m = motion.current;
    const delta = m.target - m.current;

    if (!m.enabled || Math.abs(delta) < 0.0015) {
      m.current = m.target;
      m.raf = 0;
      render();
      return;
    }

    m.current += delta * STAGE.follow;
    render();
    m.raf = requestAnimationFrame(tick);
  }, [render]);

  const kick = useCallback(() => {
    if (motion.current.raf === 0) motion.current.raf = requestAnimationFrame(tick);
  }, [tick]);

  const goTo = useCallback(
    (index: number) => {
      const m = motion.current;
      const base = Math.round(m.target);
      m.target = base + wrapOffset(index, base, count);
      kick();
    },
    [count, kick],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      motion.current.target = Math.round(motion.current.target) + direction;
      kick();
    },
    [kick],
  );

  useEffect(() => {
    const m = motion.current;
    m.enabled = enabled;

    // KIRISH: shishalar aylanib kelib joyiga tushadi. Faqat harakat yoqilganda
    // va faqat bir marta; aks holda sahna darhol tayyor turadi.
    if (enabled && !m.entered) {
      m.entered = true;
      m.current = -STAGE.entranceTurns;
      m.target = 0;
      kick();
    }
  }, [enabled, kick]);

  // O'lcham, ko'rinish, avtomatik aylanish.
  useEffect(() => {
    const viewport = viewportRef.current;
    const root = rootRef.current;
    if (viewport === null || root === null) return undefined;

    const m = motion.current;

    const measure = () => {
      m.radius = Math.max(150, Math.min(viewport.clientWidth * 0.36, 430));
      render();
    };
    measure();

    const resize = new ResizeObserver(measure);
    resize.observe(viewport);

    const visibility = new IntersectionObserver(
      ([entry]) => {
        m.inView = entry?.isIntersecting ?? true;
      },
      { threshold: 0.25 },
    );
    visibility.observe(root);

    const timer = window.setInterval(() => {
      if (!m.enabled || m.paused || m.dragging || !m.inView || document.hidden) return;
      m.target = Math.round(m.target) + 1;
      kick();
    }, STAGE.autoplaySeconds * 1000);

    return () => {
      resize.disconnect();
      visibility.disconnect();
      window.clearInterval(timer);
      cancelAnimationFrame(m.raf);
      m.raf = 0;
    };
  }, [kick, render]);

  // Sudrash (sichqoncha va barmoq).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return undefined;

    const m = motion.current;
    let startX = 0;
    let startTarget = 0;
    let pointerId = -1;

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startTarget = m.target;
      m.dragging = true;
      m.moved = 0;
    };

    const move = (event: PointerEvent) => {
      if (!m.dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      m.moved = Math.max(m.moved, Math.abs(dx));

      if (m.moved > 6) {
        try {
          viewport.setPointerCapture(pointerId);
        } catch {
          // Ushlab bo'lmasa ham sudrash ishlayveradi.
        }
        m.target = startTarget - dx / STAGE.dragPixelsPerItem;
        kick();
      }
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      m.dragging = false;
      pointerId = -1;
      // Eng yaqin shishaga "yopishadi".
      m.target = Math.round(m.target);
      kick();
    };

    viewport.addEventListener('pointerdown', down);
    viewport.addEventListener('pointermove', move);
    viewport.addEventListener('pointerup', up);
    viewport.addEventListener('pointercancel', up);

    return () => {
      viewport.removeEventListener('pointerdown', down);
      viewport.removeEventListener('pointermove', move);
      viewport.removeEventListener('pointerup', up);
      viewport.removeEventListener('pointercancel', up);
    };
  }, [kick]);

  // Sichqoncha ortidan sahna qiyaligi: faqat sichqonchali qurilmada va harakat yoqilganda.
  useEffect(() => {
    const root = rootRef.current;
    const world = worldRef.current;
    if (!enabled || root === null || world === null) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    world.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

    const move = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      world.style.transform = `rotateX(${(-y * STAGE.pointerTilt).toFixed(2)}deg) rotateY(${(x * STAGE.pointerTilt * 2).toFixed(2)}deg)`;
    };
    const leave = () => {
      world.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);

    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      world.style.transform = '';
      world.style.transition = '';
    };
  }, [enabled]);

  const current = items[active];
  const counter = labels.counter
    .replace('{n}', String(active + 1))
    .replace('{total}', String(count));

  return (
    <div
      ref={rootRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.region}
      className="relative w-full select-none"
      onMouseEnter={() => (motion.current.paused = true)}
      onMouseLeave={() => (motion.current.paused = false)}
      onFocusCapture={() => (motion.current.paused = true)}
      onBlurCapture={() => (motion.current.paused = false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          step(1);
        }
      }}
    >
      {/* ORQA YORUG'LIK — har bir mahsulot rangidan; oldidagisi ko'rinadi, qolgani so'nadi. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        {items.map((item, index) => (
          <div
            key={item.slug}
            ref={(node) => {
              glowRefs.current[index] = node;
            }}
            className="absolute inset-x-[8%] top-[6%] bottom-[10%] rounded-full blur-3xl"
            style={{
              background: `radial-gradient(closest-side, ${item.glow}66, ${item.glow}00)`,
              opacity: index === 0 ? 1 : 0,
            }}
          />
        ))}
      </div>

      <div
        ref={viewportRef}
        className="relative h-[clamp(20rem,58vh,34rem)] w-full cursor-grab touch-pan-y active:cursor-grabbing"
        style={{ perspective: `${STAGE.perspective}px`, perspectiveOrigin: '50% 42%' }}
      >
        <ul
          ref={worldRef}
          className="absolute inset-0 m-0 list-none p-0"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {items.map((item, index) => {
            const isActive = index === active;
            const style = toStyle(placeItem(wrapOffset(index, 0, count), count, DEFAULT_RADIUS));

            return (
              <li
                key={item.slug}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                aria-hidden={isActive ? undefined : true}
                className="absolute top-[2%] left-1/2 will-change-transform"
                style={{ ...style, transform: `translateX(-50%) ${style.transform}` }}
              >
                <Link
                  href={item.href}
                  tabIndex={isActive ? 0 : -1}
                  draggable={false}
                  aria-label={`${labels.open}: ${item.name}`}
                  className="block rounded-3xl outline-offset-8"
                  onClick={(event) => {
                    // Sudrashdan keyin yoki qo'shni shishada — sahifaga o'tmaymiz.
                    if (motion.current.moved > 6 || !isActive) {
                      event.preventDefault();
                      if (!isActive && motion.current.moved <= 6) goTo(index);
                    }
                  }}
                >
                  <Image
                    src={item.src}
                    alt={isActive ? item.name : ''}
                    width={item.width}
                    height={item.height}
                    priority={index === 0}
                    draggable={false}
                    sizes="(max-width: 768px) 45vw, 22vw"
                    className="pointer-events-none h-[clamp(15rem,44vh,26rem)] w-auto max-w-none"
                  />

                  {/* Sirpanchiq yuzaga AKS: shishaning o'zi, teskari va so'nib boradi. */}
                  <Image
                    src={item.src}
                    alt=""
                    aria-hidden
                    width={item.width}
                    height={item.height}
                    draggable={false}
                    sizes="(max-width: 768px) 45vw, 22vw"
                    className="pointer-events-none -mt-1 h-[clamp(15rem,44vh,26rem)] w-auto max-w-none scale-y-[-1] opacity-30 [mask-image:linear-gradient(to_top,rgba(0,0,0,0.5),transparent_38%)]"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative mt-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={labels.prev}
          className="grid size-11 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-ink-800)] text-lg transition-colors hover:border-[var(--color-fg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden>←</span>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="display-4 truncate">{current?.name}</p>
          <p className="mt-1 text-sm tabular-nums text-[var(--color-fg-muted)]">{counter}</p>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label={labels.next}
          className="grid size-11 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-ink-800)] text-lg transition-colors hover:border-[var(--color-fg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      {/* Ekran o'quvchiga oldidagi mahsulot o'zgarganini aytadi. */}
      <p className="sr-only" aria-live="polite">
        {current?.name}
      </p>
    </div>
  );
}
