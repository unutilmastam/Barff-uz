import { type Localized, type PublicImage } from '@barff/types';
import { apiFetch } from './api-client';

/**
 * Savat javobi.
 *
 * DIQQAT: narx maydonlari FAQAT O'QISH uchun. Ularni serverga qaytarib
 * yuborish mumkin emas va kerak emas — savat endpoint'lari narx
 * qabul qilmaydi (S25).
 */
export interface CartLine {
  itemId: string;
  variantId: string;
  sku: string;
  productSlug: string;
  productName: Localized;
  volumeMl: number;
  unitsPerPack: number | null;
  image: PublicImage | null;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  discount: number;
  total: number;
  currency: string;
  minOrderQuantity: number | null;
  belowMinimum: boolean;
  promoApplied: boolean;
  discountRule: { id: string; name: string } | null;
  tierDiscountBasisPoints: number | null;
}

export interface Cart {
  id: string;
  promoCode: string | null;
  lines: CartLine[];
  total: number;
  currency: string;
  hasIssues: boolean;
}

export const CART_KEY = ['dealer-cart'] as const;

export const getCart = () => apiFetch<Cart>('/dealer/cart');

export const addToCart = (variantId: string, quantity: number) =>
  apiFetch<Cart>('/dealer/cart/items', { method: 'POST', body: { variantId, quantity } });

export const setCartQuantity = (itemId: string, quantity: number) =>
  apiFetch<Cart>(`/dealer/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });

export const removeCartItem = (itemId: string) =>
  apiFetch<Cart>(`/dealer/cart/items/${itemId}`, { method: 'DELETE' });

export const clearCart = () => apiFetch<Cart>('/dealer/cart', { method: 'DELETE' });

export const setPromoCode = (code: string | null) =>
  apiFetch<Cart>('/dealer/cart/promo', { method: 'PUT', body: { code } });
