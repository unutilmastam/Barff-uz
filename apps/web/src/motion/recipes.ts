/**
 * Animatsiya retseptlari — 2026-08-26 dagi qurilishdan tiklandi
 * (git `a86f349`, `lib/animations.ts`).
 *
 * ================== BU MODUL OG'IR ==================
 *
 * Bu yerda GSAP va uning plaginlari STATIK import qilinadi, shuning
 * uchun modul FAQAT dinamik import orqali chaqiriladi:
 *
 *     const recipes = await import('./recipes');
 *
 * Tiklangan qurilishda `lib/gsap.ts` modul darajasida import qilardi
 * va GSAP dastlabki bundle'ga tushardi. Bu CLAUDE.md §17 ni buzadi
 * ("dynamic import heavy 3D", "usable content before heavy visuals")
 * va `qa/perf.mjs` dagi tekshiruvni yiqitadi — shuning uchun tartib
 * o'zgartirildi.
 *
 * Har bir retsept `gsap.context()` ICHIDA chaqirilishi kerak: kontekst
 * `revert()` qilinganda yaratilgan tween, ScrollTrigger va inline
 * stillar tozalanadi.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import {
  DURATION,
  EASES,
  IMAGE_REVEAL,
  MAGNETIC,
  MEDIA,
  PARALLAX,
  REVEAL_START,
  STAGGERS,
} from './config';

/*
  Plaginlar BIR MARTA ro'yxatdan o'tkaziladi. Har komponentda
  chaqirilsa, plagin bir necha marta yuklanadi va SSR paytida
  `window` yo'qligidan xato berardi.
*/
gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

type Target = gsap.TweenTarget;

export interface BaseOptions {
  /** `prefers-reduced-motion` yoqilganda animatsiya deyarli bir zumda tugaydi. */
  reduced?: boolean;
  /** ScrollTrigger biriktiriladigan element. Berilmasa animatsiya darhol ishlaydi. */
  trigger?: Element | null;
  start?: string;
  delay?: number;
}

const time = (value: number, reduced?: boolean) => (reduced ? 0.01 : value);
const shift = (value: number, reduced?: boolean) => (reduced ? 0 : value);

/*
  ScrollTrigger sozlamasi OBYEKT sifatida emas, TARQATILADIGAN bo'lak
  sifatida qaytariladi: `{ scrollTrigger: undefined }` yozish
  `exactOptionalPropertyTypes: true` da xato beradi ("berilgan, lekin
  undefined" va "umuman berilmagan" farqlanadi). Bo'sh obyekt
  tarqatilsa, kalit umuman qo'shilmaydi.
*/
function scrollTriggerFor(options: BaseOptions): { scrollTrigger?: ScrollTrigger.Vars } {
  if (!options.trigger) return {};
  return {
    scrollTrigger: {
      trigger: options.trigger,
      start: options.start ?? REVEAL_START,
      // Bir marta ochiladi: har skrollda qayta o'ynash chalg'itadi.
      once: true,
    },
  };
}

/** Pastdan suzib chiqish — eng ko'p ishlatiladigan reveal. */
export function fadeUp(
  targets: Target,
  options: BaseOptions & { distance?: number; stagger?: number } = {},
) {
  const { reduced, distance = 40, stagger = STAGGERS.cards, delay = 0 } = options;

  return gsap.fromTo(
    targets,
    { y: shift(distance, reduced), opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: time(DURATION.slow, reduced),
      ease: EASES.out3,
      stagger: reduced ? 0 : stagger,
      delay,
      ...scrollTriggerFor(options),
    },
  );
}

/**
 * Bo'laklarga ajratilgan matn reveal'i.
 *
 * Har bo'lak `overflow: hidden` ichidan KO'TARILIB chiqadi — faqat
 * `opacity` emas. Shuning uchun chaqiruvchi bo'laklarni yashiradigan
 * o'ram berishi kerak.
 */
export function revealText(pieces: Target, options: BaseOptions & { stagger?: number } = {}) {
  const { reduced, stagger = STAGGERS.text, delay = 0 } = options;

  return gsap.fromTo(
    pieces,
    { yPercent: shift(110, reduced), opacity: reduced ? 0 : 1 },
    {
      yPercent: 0,
      opacity: 1,
      duration: time(DURATION.slow, reduced),
      ease: EASES.out4,
      stagger: reduced ? 0 : stagger,
      delay,
      ...scrollTriggerFor(options),
    },
  );
}

/**
 * Rasm reveal: `scale 1.15` → clip-path pastdan ochiladi → `scale 1`.
 * Rasm va uni o'rab turgan element ALOHIDA animatsiya qilinadi.
 */
export function imageReveal(
  wrapper: Element,
  image: Element,
  options: BaseOptions = {},
): gsap.core.Timeline {
  const { reduced } = options;
  const duration = time(DURATION.slow, reduced);

  const timeline = gsap.timeline({
    ...scrollTriggerFor(options),
    defaults: { ease: EASES.out4 },
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
 *
 * Mobilda kuch `PARALLAX.mobileFactor` ga kamaytiriladi. Buning uchun
 * `gsap.matchMedia` ishlatiladi: u oyna o'lchami o'zgarganda tween'ni
 * o'zi qayta quradi, oddiy `matchMedia` tekshiruvi esa bir marta
 * o'lchab qotib qolardi.
 */
export function parallax(
  target: Element,
  options: { speed?: number; reduced?: boolean; trigger?: Element | null } = {},
) {
  const { speed = PARALLAX.image, reduced, trigger } = options;
  if (reduced) return null;

  const scroller = trigger ?? target;
  const media = gsap.matchMedia();

  const build = (strength: number) => () => {
    gsap.fromTo(
      target,
      { yPercent: -strength * 50 },
      {
        yPercent: strength * 50,
        ease: 'none',
        scrollTrigger: {
          trigger: scroller,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  };

  media.add(MEDIA.desktop, build(speed));
  media.add(MEDIA.mobile, build(speed * PARALLAX.mobileFactor));

  return media;
}

/**
 * Magnit effekt: element sichqonchaga tortiladi, chiqib ketganda
 * spring bilan qaytadi. Tozalash funksiyasini qaytaradi.
 */
export function magnetic(
  element: HTMLElement,
  options: { strength?: number; reduced?: boolean } = {},
): () => void {
  const { strength = MAGNETIC.strength, reduced } = options;
  if (reduced) return () => {};

  const moveX = gsap.quickTo(element, 'x', { duration: DURATION.fast, ease: EASES.out3 });
  const moveY = gsap.quickTo(element, 'y', { duration: DURATION.fast, ease: EASES.out3 });

  const onMove = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const relativeX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relativeY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    moveX(gsap.utils.clamp(-1, 1, relativeX) * strength);
    moveY(gsap.utils.clamp(-1, 1, relativeY) * strength);
  };

  const onLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: MAGNETIC.returnDuration,
      ease: MAGNETIC.returnEase,
    });
  };

  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
  };
}

/**
 * Gorizontal skroll: bo'lim pin qilinadi, ichidagi lenta yon tomonga
 * suriladi.
 *
 * Masofa lenta kengligidan DINAMIK hisoblanadi va
 * `invalidateOnRefresh` bilan oyna o'lchami o'zgarganda qayta
 * hisoblanadi — aks holda telefonni burganda lenta yarmida qolardi.
 */
export function horizontalScroll(
  section: HTMLElement,
  track: HTMLElement,
  options: { reduced?: boolean } = {},
) {
  const { reduced } = options;
  if (reduced) return null;

  const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);

  /*
    FAQAT DESKTOPDA. Telefonda bo'limni "yopishtirish" barmoq bilan
    skrollni qo'lga oladi va foydalanuvchi sahifadan chiqa olmay
    qolishi mumkin — u yerda brauzerning o'z gorizontal skrolli
    qoladi. `matchMedia` ishlatiladi, chunki u oyna o'lchami
    o'zgarganda animatsiyani o'zi qayta quradi.
  */
  const media = gsap.matchMedia();

  media.add(MEDIA.desktop, () => {
    gsap.to(track, {
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
  });

  return media;
}
