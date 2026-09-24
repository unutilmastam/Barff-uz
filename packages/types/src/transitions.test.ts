import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, canTransitionOrder, isTerminalOrderStatus } from './orders';
import { DELIVERY_STATUSES, canTransitionDelivery } from './delivery';
import { LEAD_STATUSES, canTransitionLead } from './leads';
import { DEALER_STATUSES, canTransitionDealer, isDealerActive } from './dealers';

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

describe('diler holatlari', () => {
  it('asosiy yo‘l: ariza → tasdiq', () => {
    expect(canTransitionDealer('PENDING', 'APPROVED')).toBe(true);
    expect(canTransitionDealer('PENDING', 'REJECTED')).toBe(true);
  });

  it("tasdiqlanmagan dilerni TO'XTATIB bo'lmaydi", () => {
    // To'xtatish faqat FAOL dilerga nisbatan ma'noga ega. Aks holda
    // "ko'rib chiqilmoqda" va "to'xtatilgan" holatlari aralashardi.
    expect(canTransitionDealer('PENDING', 'SUSPENDED')).toBe(false);
  });

  it('rad etilgan ariza QAYTA ko‘rib chiqilishi mumkin', () => {
    // Hujjat to'g'rilangan bo'lishi mumkin — rad etish oxirgi so'z emas.
    expect(canTransitionDealer('REJECTED', 'PENDING')).toBe(true);
    // Lekin to'g'ridan-to'g'ri tasdiqlab bo'lmaydi: ariza qaytadan
    // ko'rib chiqilishi kerak.
    expect(canTransitionDealer('REJECTED', 'APPROVED')).toBe(false);
  });

  it("to'xtatilgan diler qayta ochilishi yoki rad etilishi mumkin", () => {
    expect(canTransitionDealer('SUSPENDED', 'APPROVED')).toBe(true);
    expect(canTransitionDealer('SUSPENDED', 'REJECTED')).toBe(true);
  });

  it('o‘ziga o‘tish hech qayerda ruxsat etilmagan', () => {
    for (const status of DEALER_STATUSES) {
      expect(canTransitionDealer(status, status), status).toBe(false);
    }
  });

  it('FAQAT APPROVED holati ishlashga ruxsat beradi', () => {
    // Bu tekshiruv bir necha qatlamda takrorlanadi (guard, servis,
    // panel), shuning uchun qoida bitta joyda va u shu yerda qulflanadi.
    const active = DEALER_STATUSES.filter(isDealerActive);
    expect(active).toEqual(['APPROVED']);
  });
});
