import type Lenis from 'lenis';

/**
 * Joriy Lenis nusxasiga global kirish.
 *
 * Overlay ochilganda (MobileMenu, Modal) sahifa scroll'i to'xtatilishi kerak.
 * `body { overflow: hidden }` yolg'iz o'zi yetarli emas — Lenis o'z scroll qiymatini
 * yuritishda davom etadi va overlay yopilgach sahifa "sakrab" ketadi.
 */
let instance: Lenis | null = null;

export const smoothScroll = {
  set(next: Lenis | null) {
    instance = next;
  },

  get(): Lenis | null {
    return instance;
  },

  /** Scroll'ni to'xtatadi (overlay ochilganda). */
  stop() {
    instance?.stop();
  },

  /** Scroll'ni qayta yoqadi. */
  start() {
    instance?.start();
  },
};
