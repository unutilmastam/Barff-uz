'use client';

import { useEffect } from 'react';

/**
 * Xizmat ishchisini ro'yxatdan o'tkazadi.
 *
 * FAQAT ISHLAB CHIQARISHDA va faqat `https` (yoki `localhost`)
 * da: brauzerlar boshqa holatda uni umuman qabul qilmaydi.
 * Ishlab chiqishda u eski fayllarni keshlab, o'zgarishlarni
 * ko'rsatmay qo'yardi — bu S21 dagi "eski build" tuzog'ining
 * yana bir turi bo'lardi.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ro'yxatdan o'tmasa ilova baribir ishlaydi — faqat oflayn
      // ochilmaydi. Haydovchini xato bilan bezovta qilmaymiz.
    });
  }, []);

  return null;
}
