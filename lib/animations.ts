'use client';

import { gsap, ScrollTrigger } from '@/lib/gsap';
import {
  DURATION,
  EASE,
  IMAGE_REVEAL,
  MAGNETIC_RETURN,
  MAGNETIC_STRENGTH,
  PARALLAX,
  SCROLL_TRIGGER,
  STAGGER,
} from '@/lib/motion';

/**
 * Sayt bo'ylab ishlatiladigan animatsiya retseptlari.
 *
 * Har bir funksiya `gsap.context()` ICHIDA chaqirilishi kerak — kontekst `revert()`
 * qilinganda yaratilgan tween, ScrollTrigger va inline stillar tozalanadi.
 * Komponentlar bu yerga davomiylik/easing yozmaydi: hammasi `lib/motion.ts` dan.
 */

type Target = gsap.TweenTarget;

interface BaseOptions {
  /** `prefers-reduced-motion` yoqilganda animatsiya deyarli bir zumda tugaydi. */
  reduced?: boolean;
  /** ScrollTrigger biriktiriladigan element. Berilmasa animatsiya darhol ishlaydi. */
  trigger?: Element | null;
  start?: string;
  delay?: number;
}

const time = (value: number, reduced?: boolean) => (reduced ? 0.01 : value);
const shift = (value: number, reduced?: boolean) => (reduced ? 0 : value);

function scrollTriggerFor(options: BaseOptions): ScrollTrigger.Vars | undefined {
  if (!options.trigger) return undefined;
  return {
    trigger: options.trigger,
    start: options.start ?? SCROLL_TRIGGER.revealStart,
    once: true,
  };
}

/** Pastdan suzib chiqish — eng ko'p ishlatiladigan reveal. */
export function fadeUp(targets: Target, options: BaseOptions & { distance?: number; stagger?: number } = {}) {
  const { reduced, distance = 40, stagger = STAGGER.cards, delay = 0 } = options;

  return gsap.fromTo(
    targets,
    { y: shift(distance, reduced), opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: time(DURATION.section, reduced),
      ease: EASE.out3,
      stagger: reduced ? 0 : stagger,
      delay,
      scrollTrigger: scrollTriggerFor(options),
    },
  );
}

/**
 * Bo'laklarga ajratilgan matn reveal'i.
 * Har bo'lak `overflow: hidden` ichidan ko'tarilib chiqadi — faqat `opacity` emas.
 */
export function revealText(pieces: Target, options: BaseOptions & { stagger?: number } = {}) {
  const { reduced, stagger = STAGGER.text, delay = 0 } = options;

  return gsap.fromTo(
    pieces,
    { yPercent: shift(110, reduced), opacity: reduced ? 0 : 1 },
    {
      yPercent: 0,
      opacity: 1,
      duration: time(DURATION.section, reduced),
      ease: EASE.out4,
      stagger: reduced ? 0 : stagger,
      delay,
      scrollTrigger: scrollTriggerFor(options),
    },
  );
}

/**
 * Rasm reveal: `scale 1.15` → clip-path pastdan ochiladi → `scale 1`.
 * Rasm va uni o'rab turgan element alohida animatsiya qilinadi.
 */
export function imageReveal(
  wrapper: Element,
  image: Element,
  options: BaseOptions = {},
): gsap.core.Timeline {
  const { reduced } = options;
  const duration = time(DURATION.section, reduced);

  const timeline = gsap.timeline({
    scrollTrigger: scrollTriggerFor(options),
    defaults: { ease: EASE.out4 },
  });

  timeline
    .fromTo(
      wrapper,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration },
      0,
    )
    .fromTo(
      image,
      { scale: reduced ? 1 : IMAGE_REVEAL.fromScale },
      { scale: IMAGE_REVEAL.toScale, duration: duration * 1.2 },
      0,
    );

  return timeline;
}

/**
 * Parallaks siljish.
 * `speed` — `lib/motion.ts` dagi `PARALLAX` qiymatlaridan (fon 0.1 / rasm 0.25 / meva 0.45).
 */
export function parallax(
  target: Element,
  options: { speed?: number; reduced?: boolean; trigger?: Element | null } = {},
) {
  const { speed = PARALLAX.image, reduced, trigger } = options;
  if (reduced) return null;

  const scroller = trigger ?? target;

  return gsap.fromTo(
    target,
    { yPercent: -speed * 50 },
    {
      yPercent: speed * 50,
      ease: 'none',
      scrollTrigger: {
        trigger: scroller,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    },
  );
}

/**
 * Magnit effekt: element sichqonchaga 8–15px gacha tortiladi, chiqib ketganda spring bilan qaytadi.
 * Tozalash funksiyasini qaytaradi.
 */
export function magnetic(
  element: HTMLElement,
  options: { strength?: number; reduced?: boolean } = {},
): () => void {
  const { strength = MAGNETIC_STRENGTH, reduced } = options;
  if (reduced) return () => {};

  const moveX = gsap.quickTo(element, 'x', { duration: DURATION.micro, ease: EASE.out3 });
  const moveY = gsap.quickTo(element, 'y', { duration: DURATION.micro, ease: EASE.out3 });

  const onMove = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const relativeX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relativeY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    moveX(gsap.utils.clamp(-1, 1, relativeX) * strength);
    moveY(gsap.utils.clamp(-1, 1, relativeY) * strength);
  };

  const onLeave = () => {
    gsap.to(element, { x: 0, y: 0, ...MAGNETIC_RETURN });
  };

  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
  };
}

/**
 * Gorizontal scroll: bo'lim pin qilinadi, ichidagi lenta yon tomonga suriladi.
 * Masofa lenta kengligidan dinamik hisoblanadi va `invalidateOnRefresh` bilan
 * oyna o'lchami o'zgarganda qayta hisoblanadi.
 */
export function horizontalScroll(
  section: HTMLElement,
  track: HTMLElement,
  options: { reduced?: boolean } = {},
) {
  const { reduced } = options;
  if (reduced) return null;

  const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);

  return gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
}

/** Sahifa o'tishi: overlay pastdan yopadi, keyin tepaga chiqib ketadi. */
export function pageTransition(overlay: Element, options: { reduced?: boolean } = {}) {
  const { reduced } = options;

  return gsap
    .timeline()
    .set(overlay, { yPercent: 100, opacity: 1 })
    .to(overlay, { yPercent: 0, duration: time(DURATION.ui * 0.6, reduced), ease: EASE.out4 })
    .to(overlay, { yPercent: -100, duration: time(DURATION.ui * 0.7, reduced), ease: EASE.expo })
    .set(overlay, { opacity: 0 });
}
