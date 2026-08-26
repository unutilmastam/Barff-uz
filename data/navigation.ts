import type { NavItem } from '@/lib/types';

/**
 * Menyu shu yerdan o'qiladi — Header/Footer/MobileMenu ichida hardcode QILINMAYDI.
 * Sahifalar Phase 8 da quriladi; havolalar shu paytgacha yakuniy emas.
 */
export const mainNavigation: NavItem[] = [
  { id: 'products', label: 'PRODUCTS', href: '/products' },
  { id: 'about', label: 'ABOUT', href: '/about' },
  { id: 'story', label: 'STORY', href: '/story' },
  { id: 'news', label: 'NEWS', href: '/news' },
  { id: 'contact', label: 'CONTACT', href: '/contact' },
];

/** Footer ustunlari — [CLIENT CONTENT REQUIRED] (huquqiy havolalar, PDF hujjatlar). */
export const footerNavigation: NavItem[] = [];
