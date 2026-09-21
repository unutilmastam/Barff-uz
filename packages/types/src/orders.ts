/**
 * Buyurtma holatlari va ularning o'tish qoidalari (CLAUDE.md §5).
 *
 * O'tish xaritasi shu yerda turadi, chunki uni API ham, admin UI ham
 * bir xil tushunishi kerak. Ammo QOIDANI MAJBURLASH server tomonda —
 * frontend faqat qaysi tugmani ko'rsatishni hal qiladi (§12, §30).
 */
export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'CONFIRMED',
  'RESERVED',
  'PICKING',
  'PACKED',
  'READY_FOR_DELIVERY',
  'DRIVER_ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Har holatdan qaysi holatlarga o'tish mumkin. */
export const ORDER_STATUS_TRANSITIONS = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RESERVED', 'CANCELLED'],
  RESERVED: ['PICKING', 'CANCELLED'],
  PICKING: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

/** Yakuniy holatlar — bulardan keyin o'zgarish bo'lmaydi. */
export const TERMINAL_ORDER_STATUSES = ['DELIVERED', 'CANCELLED'] as const;

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_STATUS_TRANSITIONS[from] as readonly OrderStatus[]).includes(to);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return (TERMINAL_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}
