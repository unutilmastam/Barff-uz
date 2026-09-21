/**
 * Ombor harakati turlari (CLAUDE.md §7).
 * Har bir qoldiq o'zgarishi auditga tushadi — harakatsiz qoldiq o'zgarmaydi.
 */
export const STOCK_MOVEMENT_TYPES = [
  'IN',
  'OUT',
  'RESERVED',
  'RELEASED',
  'TRANSFER',
  'ADJUSTMENT',
  'RETURN',
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** Qoldiqni oshiradigan harakatlar (qolganlari kamaytiradi yoki band qiladi). */
export const INBOUND_MOVEMENT_TYPES = ['IN', 'RETURN', 'RELEASED'] as const;
