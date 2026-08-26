import type { VideoAsset } from '@/lib/types';

/**
 * VAQTINCHALIK PLACEHOLDER VIDEOLAR.
 *
 * Bular shu loyiha uchun generatsiya qilingan 3 sekundlik WebM lavhalar — kadrda
 * "PLACEHOLDER VIDEO / REEL" yozuvi bor. Boshqa saytdan hech narsa ko'chirilmagan (9-qoida).
 * [CLIENT CONTENT REQUIRED] — zavod / ishlab chiqarish videosi va reels lavhalari.
 */

/** Bosh sahifadagi katta brend videosi. */
export const brandVideo: VideoAsset | null = {
  id: 'brand',
  src: '/videos/placeholder-brand.webm',
  poster: '/images/placeholder-video-poster.jpg',
  title: {
    uz: 'Vaqtinchalik brend videosi',
    ru: 'Временное видео бренда',
    en: 'Placeholder brand video',
  },
  width: 1280,
  height: 720,
};

/** 9:16 vertikal lavhalar. */
export const reels: VideoAsset[] = [
  {
    id: 'reel-01',
    src: '/videos/placeholder-reel-01.webm',
    poster: '/images/placeholder-reel-01.jpg',
    title: { uz: 'Vaqtinchalik lavha 01', ru: 'Временный ролик 01', en: 'Placeholder reel 01' },
    width: 540,
    height: 960,
  },
  {
    id: 'reel-02',
    src: '/videos/placeholder-reel-02.webm',
    poster: '/images/placeholder-reel-02.jpg',
    title: { uz: 'Vaqtinchalik lavha 02', ru: 'Временный ролик 02', en: 'Placeholder reel 02' },
    width: 540,
    height: 960,
  },
  {
    id: 'reel-03',
    src: '/videos/placeholder-reel-03.webm',
    poster: '/images/placeholder-reel-03.jpg',
    title: { uz: 'Vaqtinchalik lavha 03', ru: 'Временный ролик 03', en: 'Placeholder reel 03' },
    width: 540,
    height: 960,
  },
  {
    id: 'reel-04',
    src: '/videos/placeholder-reel-04.webm',
    poster: '/images/placeholder-reel-04.jpg',
    title: { uz: 'Vaqtinchalik lavha 04', ru: 'Временный ролик 04', en: 'Placeholder reel 04' },
    width: 540,
    height: 960,
  },
];
