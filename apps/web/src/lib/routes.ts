/**
 * Qaysi ommaviy sahifalar QURILGAN.
 *
 * NEGA bu ro'yxat kerak: Next `<Link>` ning nishonini oldindan
 * yuklaydi (prefetch). Mavjud bo'lmagan yo'lga havola qo'yilsa, o'sha
 * RSC so'rovi TUGAMAY osilib qoladi — buni o'lchab ko'rdim: bosh
 * sahifada `/uz/become-partner` so'rovi ochiq qolib, sahifa hech
 * qachon "network idle" holatiga yetmadi. Ya'ni "keyin qo'shamiz"
 * degan havola shunchaki 404 emas, har bir tashrifda osilgan so'rov.
 *
 * Shuning uchun havola FAQAT sahifa qurilgandan keyin ko'rsatiladi.
 * Yangi sahifa qo'shilganda shu yerda `true` qilinadi.
 */
export const ROUTE_READY = {
  /** S12 */
  home: true,
  company: true,
  products: true,
  /** S13 */
  production: false,
  quality: false,
  partners: false,
  news: false,
  gallery: false,
  contact: false,
  catalog: false,
  /** S14 */
  becomePartner: false,
} as const;

export type RouteKey = keyof typeof ROUTE_READY;

export function routeReady(key: RouteKey): boolean {
  return ROUTE_READY[key];
}
