/**
 * `undefined` qiymatli kalitlarni obyektdan olib tashlaydi.
 *
 * NEGA kerak: `exactOptionalPropertyTypes` yoqilgan. Prisma maydonni
 * `sku?: string` deb e'lon qiladi (ya'ni "kalit bo'lmasligi mumkin"),
 * Zod esa `.optional()` uchun `sku?: string | undefined` beradi
 * (ya'ni "kalit bo'lib, qiymati `undefined` bo'lishi mumkin"). Bu ikkisi
 * bir xil emas, va farqi bejiz emas: Prisma uchun `{ sku: undefined }`
 * "o'zgartirma" degani emas, balki tipga umuman to'g'ri kelmaydi.
 *
 * To'g'ri yechim — qiymati yo'q kalitni butunlay OLIB TASHLASH.
 *
 * Qaytariladigan tip kalitlarni mavjud deb ko'rsatadi. Bu majburiy
 * maydonlar uchun xavfsiz, chunki ular shu nuqtaga yetguncha Zod
 * tomonidan tekshirilgan bo'ladi; ixtiyoriy maydonlar uchun esa Prisma
 * baribir qisman obyektni qabul qiladi.
 */
// Cheklov `object`, `Record<string, unknown>` emas: DTO'lar klass
// nusxalari bo'lgani uchun ularda indeks imzosi yo'q.
export function defined<T extends object>(
  input: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) result[key] = value;
  }

  return result as { [K in keyof T]: Exclude<T[K], undefined> };
}
