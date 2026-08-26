/**
 * Aloqa formasi konfiguratsiyasi.
 *
 * XAVFSIZLIK: API kalitlari, tokenlar va maxfiy manzillar KODGA YOZILMAYDI.
 * Yuborish manzili muhit o'zgaruvchisidan olinadi.
 *
 * `NEXT_PUBLIC_` prefiksi brauzerga chiqadi — shuning uchun u yerga faqat OCHIQ
 * endpoint qo'yiladi (masalan o'z serverimizdagi `/api/contact` yo'li). Telegram
 * bot tokeni yoki email API kaliti kabi MAXFIY qiymatlar hech qachon
 * `NEXT_PUBLIC_` bilan berilmaydi — ular server tomonda saqlanadi.
 *
 * Manzil sozlanmagan bo'lsa forma to'liq ishlaydi va validatsiya qiladi, lekin
 * yuborish o'rniga aniq xabar ko'rsatadi (jimgina "muvaffaqiyat" ko'rsatilmaydi).
 */
export const CONTACT_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT ?? '';

export const isContactConfigured = (): boolean => CONTACT_ENDPOINT.length > 0;

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  message: string;
}
