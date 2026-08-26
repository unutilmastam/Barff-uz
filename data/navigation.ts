import type { NavItem } from '@/lib/types';

/**
 * Menyu shu yerdan o'qiladi — Header/Footer/MobileMenu ichida hardcode QILINMAYDI.
 * Matnlar `data/locales/*.ts` dan `labelKey` orqali olinadi.
 * Sahifalar Phase 8 da quriladi; havolalar shu paytgacha yakuniy emas.
 */
export const mainNavigation: NavItem[] = [
  { id: 'products', labelKey: 'products', href: '/products' },
  { id: 'about', labelKey: 'about', href: '/about' },
  { id: 'story', labelKey: 'story', href: '/story' },
  { id: 'news', labelKey: 'news', href: '/news' },
  { id: 'contact', labelKey: 'contact', href: '/contact' },
];

/** Footer ustunlari — [CLIENT CONTENT REQUIRED] (huquqiy havolalar, PDF hujjatlar). */
export const footerNavigation: NavItem[] = [];
