import { type Localized, type Paginated, type PublicImage } from '@barff/types';
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

// =============================================================================
// BUYURTMALAR (S26)
// =============================================================================

export interface OrderSummary {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  shippingLabel: string;
  shippingRegion: string;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  shippingNotes: string | null;
  note: string | null;
  promoCode: string | null;
  createdAt: string;
  _count?: { items: number };
}

export interface OrderItem {
  id: string;
  variantId: string;
  sku: string;
  productName: Localized;
  volumeMl: number;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  total: number;
  appliedRuleName: string | null;
}

export interface OrderEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
  history: OrderEvent[];
}

export interface DealerAddress {
  id: string;
  label: string;
  region: string;
  district: string | null;
  city: string | null;
  street: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
}

export const ORDERS_KEY = ['dealer-orders'] as const;

export const getAddresses = () => apiFetch<DealerAddress[]>('/dealer/addresses');

export const getOrders = (page = 1) =>
  apiFetch<Paginated<OrderSummary>>(`/dealer/orders?page=${page}&limit=20`);

export const getOrder = (id: string) => apiFetch<OrderDetail>(`/dealer/orders/${id}`);

export const cancelOrder = (id: string) =>
  apiFetch<OrderSummary>(`/dealer/orders/${id}/cancel`, { method: 'POST' });

export interface SubmitOrderInput {
  addressId: string;
  note?: string;
  idempotencyKey: string;
}

/**
 * Buyurtma yuborish.
 *
 * `idempotencyKey` MAJBURIY va u FORMA OCHILGANDA bir marta
 * yaratiladi — yuborish tugmasi bosilganda emas. Sabab: tugma ikki
 * marta bosilsa yoki tarmoq uzilib qayta yuborilsa, kalit BIR XIL
 * bo'lishi kerak. Har bosishda yangi kalit yaratilsa, himoya umuman
 * ishlamasdi.
 */
export const submitOrder = (input: SubmitOrderInput) =>
  apiFetch<OrderSummary & { duplicate: boolean }>('/dealer/orders', {
    method: 'POST',
    body: input,
  });
