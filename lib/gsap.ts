'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * GSAP plaginlari bir joyda ro'yxatdan o'tkaziladi.
 *
 * Har komponentda `registerPlugin` chaqirilsa plaginlar bir necha marta yuklanadi va
 * SSR paytida `window` yo'qligidan xato beradi — shu sababli yagona kirish nuqtasi.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };
