/** Yetkazib berish holatlari (CLAUDE.md §6). */
export const DELIVERY_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_TRANSITIONS = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'FAILED', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['ARRIVED', 'FAILED'],
  ARRIVED: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['ASSIGNED'],
  CANCELLED: [],
} as const satisfies Record<DeliveryStatus, readonly DeliveryStatus[]>;

export const TERMINAL_DELIVERY_STATUSES = ['DELIVERED', 'CANCELLED'] as const;

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return (DELIVERY_STATUS_TRANSITIONS[from] as readonly DeliveryStatus[]).includes(to);
}

/** Yetkazib berish tasdig'i (CLAUDE.md §6) — haydovchi PWA'sidan keladi. */
export interface ProofOfDelivery {
  photoUrl?: string;
  signatureUrl?: string;
  note?: string;
  receivedBy?: string;
  completedAt: string;
}
