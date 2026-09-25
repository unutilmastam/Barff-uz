/**
 * Ombor domeni (CLAUDE.md §7).
 *
 * YAGONA HAQIQAT MANBAI — HARAKATLAR JURNALI. `warehouse_stock`
 * jadvali uning proyeksiyasi va bazadagi trigger orqali yuritiladi:
 * qoldiqni to'g'ridan-to'g'ri o'zgartirib bo'lmaydi (S30 DoD).
 */

/**
 * Harakat turlari.
 *
 * `IN` — kelim (ishlab chiqarish, yetkazib beruvchi).
 * `OUT` — chiqim (jo'natildi, yaroqsiz).
 * `RESERVED` — buyurtma uchun band qilindi (S31).
 * `RELEASED` — band bekor qilindi.
 * `TRANSFER` — omborlar orasida ko'chirish (ikkita qator).
 * `ADJUSTMENT` — inventarizatsiya tuzatishi; SABAB SHART.
 * `RETURN` — qaytib keldi.
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

/**
 * JISMONIY qoldiqqa tegadigan turlar.
 *
 * `RESERVED` va `RELEASED` bu ro'yxatda YO'Q va bu muhim: band qilish
 * tovarni omborda qoldiradi, faqat uni boshqa buyurtmaga berib
 * bo'lmaydi. Ilgari bu yerda `INBOUND_MOVEMENT_TYPES` degan ro'yxat
 * bor edi va u `RELEASED` ni "kelim" deb ko'rsatardi — bu ikki
 * boshqa tushunchani (qoldiq va MAVJUD qoldiq) aralashtirardi.
 */
export const PHYSICAL_MOVEMENT_TYPES = [
  'IN',
  'OUT',
  'TRANSFER',
  'ADJUSTMENT',
  'RETURN',
] as const satisfies readonly StockMovementType[];

/** BAND qilingan ulushga tegadigan turlar. */
export const RESERVATION_MOVEMENT_TYPES = [
  'RESERVED',
  'RELEASED',
] as const satisfies readonly StockMovementType[];

/**
 * Miqdor ISHORALI kiritiladigan turlar.
 *
 * Qolganlarida ishorani turning o'zi belgilaydi (`OUT` har doim
 * kamaytiradi), shuning uchun manfiy son xato hisoblanadi.
 */
export const SIGNED_MOVEMENT_TYPES = [
  'ADJUSTMENT',
  'TRANSFER',
] as const satisfies readonly StockMovementType[];

export function isPhysicalMovement(type: StockMovementType): boolean {
  return (PHYSICAL_MOVEMENT_TYPES as readonly StockMovementType[]).includes(type);
}

export function isSignedMovement(type: StockMovementType): boolean {
  return (SIGNED_MOVEMENT_TYPES as readonly StockMovementType[]).includes(type);
}

/**
 * Harakat qoldiqni qanday o'zgartiradi.
 *
 * Bu funksiya BAZADAGI trigger bilan BIR XIL qoidani ifodalaydi
 * (`migration.sql`, `barff_apply_stock_movement`). Ikkinchi nusxa
 * ataylab: panel natijani OLDINDAN ko'rsatishi kerak, lekin
 * HAQIQIY hisob baribir bazada bo'ladi. Test ikkalasining mosligini
 * tekshiradi.
 */
export function movementDelta(
  type: StockMovementType,
  quantity: number,
): { quantity: number; reserved: number } {
  switch (type) {
    case 'IN':
    case 'RETURN':
      return { quantity: Math.abs(quantity), reserved: 0 };
    case 'OUT':
      return { quantity: -Math.abs(quantity), reserved: 0 };
    case 'ADJUSTMENT':
    case 'TRANSFER':
      return { quantity, reserved: 0 };
    case 'RESERVED':
      return { quantity: 0, reserved: Math.abs(quantity) };
    case 'RELEASED':
      return { quantity: 0, reserved: -Math.abs(quantity) };
  }
}

/** Mavjud (band qilinmagan) qoldiq. */
export function availableStock(quantity: number, reservedQuantity: number): number {
  return quantity - reservedQuantity;
}
