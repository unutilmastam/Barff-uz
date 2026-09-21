import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, canTransitionOrder, isTerminalOrderStatus } from './orders';
import { DELIVERY_STATUSES, canTransitionDelivery } from './delivery';
import { LEAD_STATUSES, canTransitionLead } from './leads';

describe('buyurtma holatlari', () => {
  it("spec'dagi asosiy ketma-ketlikka ruxsat beradi", () => {
    const happyPath = [
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
    ] as const;

    for (let i = 0; i < happyPath.length - 1; i += 1) {
      const from = happyPath[i]!;
      const to = happyPath[i + 1]!;
      expect(canTransitionOrder(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('bosqichni tashlab ketishga ruxsat bermaydi', () => {
    expect(canTransitionOrder('DRAFT', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrder('CONFIRMED', 'DELIVERED')).toBe(false);
  });

  it('orqaga qaytishga ruxsat bermaydi', () => {
    expect(canTransitionOrder('CONFIRMED', 'DRAFT')).toBe(false);
    expect(canTransitionOrder('PACKED', 'PICKING')).toBe(false);
  });

  it("yakuniy holatlardan chiqib bo'lmaydi", () => {
    for (const status of ORDER_STATUSES) {
      if (!isTerminalOrderStatus(status)) continue;
      for (const target of ORDER_STATUSES) {
        expect(canTransitionOrder(status, target), `${status} -> ${target}`).toBe(false);
      }
    }
  });

  it('DELIVERED dan tashqari hamma joydan bekor qilish mumkin', () => {
    for (const status of ORDER_STATUSES) {
      if (status === 'DELIVERED' || status === 'CANCELLED') continue;
      expect(canTransitionOrder(status, 'CANCELLED'), status).toBe(true);
    }
  });
});

describe('yetkazib berish holatlari', () => {
  it('asosiy ketma-ketlik ishlaydi', () => {
    const path = [
      'CREATED',
      'ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED',
      'DELIVERED',
    ] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransitionDelivery(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it('muvaffaqiyatsiz yetkazishdan keyin qayta biriktirish mumkin', () => {
    expect(canTransitionDelivery('FAILED', 'ASSIGNED')).toBe(true);
  });

  it("yetkazilgandan keyin hech qayerga o'tmaydi", () => {
    for (const status of DELIVERY_STATUSES) {
      expect(canTransitionDelivery('DELIVERED', status)).toBe(false);
    }
  });
});

describe('lead holatlari', () => {
  it('bosqichma-bosqich oldinga siljiydi', () => {
    expect(canTransitionLead('NEW', 'CONTACTED')).toBe(true);
    expect(canTransitionLead('NEW', 'CONVERTED')).toBe(false);
  });

  it('CONVERTED dan tashqari hamma joydan rad etish mumkin', () => {
    for (const status of LEAD_STATUSES) {
      if (status === 'CONVERTED' || status === 'REJECTED') continue;
      expect(canTransitionLead(status, 'REJECTED'), status).toBe(true);
    }
  });
});
