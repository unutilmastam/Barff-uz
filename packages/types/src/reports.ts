/**
 * Hisobotlar (CLAUDE.md §22, S37).
 *
 * Siyosat: `docs/REPORTS-POLICY.md`. Bu yerda faqat ikki tomon —
 * API ham, admin ekrani ham — bir xil tushunishi kerak bo'lgan
 * narsalar turadi: hisobotlar ro'yxati va "sotuv" ning ta'rifi.
 */

/**
 * Hisobotlar kunni QAYSI VAQT BELBOSIDA hisoblaydi.
 *
 * O'zbekiston UTC+5 va yozgi vaqtga o'tmaydi. Bazada vaqt UTC da
 * turadi; kunlar bo'yicha guruhlash UTC bilan qilinsa, ertalab
 * soat 05:00 gacha bo'lgan buyurtmalar KECHAGI kunga tushardi va
 * kunlik jami dilerning o'z hisobidan farq qilardi.
 */
export const REPORT_TIME_ZONE = 'Asia/Tashkent';

/**
 * Qaysi buyurtma "SOTUV" hisoblanadi.
 *
 * TASDIQLANGAN va undan keyingilari. Chiqarib tashlanadi:
 *
 * - `DRAFT`, `PENDING_REVIEW` — hali qabul qilinmagan, ya'ni
 *   yo'qolishi mumkin bo'lgan taklif;
 * - `CANCELLED` — bekor qilingan.
 *
 * `DELIVERED` ni FAQAT o'zini olish sotuvni kechiktirardi: zaxiraga
 * olingan va yo'ldagi tovar allaqachon dilerga va'da qilingan.
 * Yetkazilgani alohida ustunda ko'rsatiladi.
 */
export const SALES_ORDER_STATUSES = [
  'CONFIRMED',
  'RESERVED',
  'PICKING',
  'PACKED',
  'READY_FOR_DELIVERY',
  'DRIVER_ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
] as const;

export const REPORT_FILTERS = ['from', 'to', 'region', 'dealerId', 'productId'] as const;
export type ReportFilter = (typeof REPORT_FILTERS)[number];

export type ReportColumnType =
  'text' | 'integer' | 'decimal' | 'money' | 'percent' | 'date' | 'datetime';

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
}

export interface ReportDefinition {
  key: string;
  title: string;
  description: string;
  /** Qaysi filtrlar bu hisobotga TA'SIR qiladi. Qolganlari jim e'tiborsiz qoldirilmaydi — ekranda o'chiriladi. */
  filters: readonly ReportFilter[];
}

export const REPORTS = [
  {
    key: 'sales',
    title: 'Sotuv',
    description: 'Kunlar bo‘yicha qabul qilingan buyurtmalar va ularning summasi.',
    /*
      `productId` YO'Q ATAYLAB: buyurtmada bir nechta mahsulot bo'lsa,
      filtr butun buyurtma summasini ko'rsatib, tanlangan mahsulotning
      ulushini emas. Mahsulot kesimi — `product-sales` da.
    */
    filters: ['from', 'to', 'region', 'dealerId'],
  },
  {
    key: 'orders',
    title: 'Buyurtmalar',
    description: 'Buyurtmalar holatlar bo‘yicha: nechtasi qayerda turibdi.',
    filters: ['from', 'to', 'region', 'dealerId'],
  },
  {
    key: 'dealer-performance',
    title: 'Dilerlar samaradorligi',
    description: 'Har bir diler bo‘yicha buyurtma, summa va yetkazilgan ulushi.',
    filters: ['from', 'to', 'region', 'dealerId'],
  },
  {
    key: 'product-sales',
    title: 'Mahsulot sotuvi',
    description: 'Har bir mahsulot varianti bo‘yicha sotilgan miqdor va tushum.',
    filters: ['from', 'to', 'region', 'dealerId', 'productId'],
  },
  {
    key: 'regional-sales',
    title: 'Hududlar bo‘yicha sotuv',
    description: 'Buyurtma yetkaziladigan hudud bo‘yicha sotuv.',
    filters: ['from', 'to', 'dealerId'],
  },
  {
    key: 'stock',
    title: 'Qoldiqlar',
    description: 'Hozirgi qoldiq, band va mavjud miqdor — omborlar bo‘yicha.',
    filters: ['region', 'productId'],
  },
  {
    key: 'stock-movements',
    title: 'Ombor harakatlari',
    description: 'Harakat jurnali: kirim, chiqim, zaxira, tuzatish.',
    filters: ['from', 'to', 'region', 'productId'],
  },
  {
    key: 'deliveries',
    title: 'Yetkazmalar',
    description: 'Yetkazmalar holatlar bo‘yicha va yetkazish vaqti.',
    filters: ['from', 'to', 'region', 'dealerId'],
  },
  {
    key: 'driver-performance',
    title: 'Haydovchilar samaradorligi',
    description: 'Har bir haydovchi bo‘yicha biriktirilgan, topshirilgan va bajarilmagan.',
    filters: ['from', 'to', 'region'],
  },
  {
    key: 'lead-conversion',
    title: 'Arizalar konversiyasi',
    description: 'B2B arizalar holatlar bo‘yicha va diler bo‘lganlar ulushi.',
    filters: ['from', 'to', 'region'],
  },
] as const satisfies readonly ReportDefinition[];

export type ReportKey = (typeof REPORTS)[number]['key'];

export const REPORT_KEYS = REPORTS.map((report) => report.key) as unknown as readonly [
  ReportKey,
  ...ReportKey[],
];

export interface ReportResult {
  key: ReportKey;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  /** Butun tanlov bo'yicha jami — `rows` qisqartirilgan bo'lsa ham TO'LIQ hisoblanadi. */
  totals: Record<string, number>;
  /** `true` — qatorlar chegaradan oshib, faqat boshlanishi qaytdi; jami baribir to'liq. */
  truncated: boolean;
  rowLimit: number;
  filters: Partial<Record<ReportFilter, string>>;
  generatedAt: string;
}
