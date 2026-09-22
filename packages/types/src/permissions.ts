import { type Role } from './roles';

/**
 * Ruxsatlar katalogi (CLAUDE.md §3, §8).
 *
 * Nomlash: `<soha>.<amal>`. Ro'yxat SHU YERDA yagona manba bo'lib turadi —
 * seed ma'lumotlar bazasini shundan to'ldiradi, API guard'lari ham shuni
 * o'qiydi. Ikki joyda alohida ro'yxat bo'lsa, ular albatta bir-biridan
 * uzoqlashadi.
 *
 * DIQQAT: bu tiplar UI uchun EMAS. Avtorizatsiya har doim serverda,
 * foydalanuvchining ma'lumotlar bazasidagi rollari bo'yicha tekshiriladi.
 */
export const PERMISSIONS = [
  // Kontent (CMS)
  'content.view',
  'content.manage',
  'media.upload',
  'media.delete',

  // Mahsulotlar va narxlar
  'products.view',
  'products.manage',
  'prices.view',
  'prices.manage',

  // Dilerlar
  'dealers.view',
  'dealers.manage',
  'dealers.approve',

  // Buyurtmalar
  'orders.view',
  'orders.view.own',
  'orders.create',
  'orders.manage',
  'orders.status.change',

  // Ombor
  'warehouse.view',
  'warehouse.manage',
  'stock.adjust',

  // Yetkazib berish
  'delivery.view',
  'delivery.manage',
  'delivery.assign',
  'delivery.status.change',
  'delivery.view.own',

  // Moliya
  'invoices.view',
  'invoices.manage',
  'payments.view',
  'payments.manage',

  // Lead'lar
  'leads.view',
  'leads.manage',

  // Hisobotlar
  'reports.view',
  'reports.export',

  // Tizim
  'users.view',
  'users.manage',
  'roles.manage',
  'settings.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Har bir rolning standart ruxsatlari.
 *
 * Bu faqat BOSHLANG'ICH holat: seed shu jadvalni yozadi, keyin admin
 * CMS orqali o'zgartirishi mumkin. Shuning uchun kod hech qachon shu
 * obyektga qarab avtorizatsiya qilmaydi — har doim bazadagi holatga qaraydi.
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  // Mehmon — autentifikatsiyasiz, hech qanday ruxsatga ega emas.
  VISITOR: [],

  DEALER: ['products.view', 'prices.view', 'orders.view.own', 'orders.create', 'invoices.view'],

  SALES: [
    'content.view',
    'products.view',
    'prices.view',
    'dealers.view',
    'dealers.manage',
    'orders.view',
    'leads.view',
    'leads.manage',
    'reports.view',
  ],

  WAREHOUSE: [
    'products.view',
    'orders.view',
    'orders.status.change',
    'warehouse.view',
    'warehouse.manage',
    'stock.adjust',
  ],

  LOGISTICS: [
    'orders.view',
    'delivery.view',
    'delivery.manage',
    'delivery.assign',
    'delivery.status.change',
  ],

  // Haydovchi faqat O'ZIGA biriktirilgan yetkazmalarni ko'radi.
  DRIVER: ['delivery.view.own', 'delivery.status.change'],

  ADMIN: [...PERMISSIONS],
} as const satisfies Record<Role, readonly Permission[]>;
