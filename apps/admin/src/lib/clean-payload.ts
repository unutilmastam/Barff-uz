/**
 * Formadagi "bo'sh" qiymatlarni serverga YUBORMAYDI.
 *
 * Forma har bir maydon uchun boshlang'ich qiymat saqlaydi: matn uchun
 * `''`, ko'p tilli maydon uchun `{ uz: '', ru: '', en: '' }`, tanlov
 * uchun `null`. Bularning hammasi "to'ldirilmagan" degani, lekin
 * serverga yuborilsa "berilgan, lekin noto'g'ri" bo'lib tushunilardi:
 *
 *   - `{ uz: '', ru: '', en: '' }` -> "kamida bitta tilda matn shart";
 *   - `null` -> "satr kutilgan edi".
 *
 * Ya'ni ixtiyoriy maydonni to'ldirmaslik butun yozuvni saqlashga
 * to'sqinlik qilardi. Shuning uchun bo'sh qiymatlar TUSHIRIB
 * QOLDIRILADI va server ularni "o'zgartirilmagan" deb qabul qiladi.
 */
export function cleanPayload(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    // `null` — "tanlanmagan". Serverda bu `undefined` bilan bir xil.
    if (item === null || item === undefined) continue;

    if (typeof item === 'string') {
      if (item.trim().length === 0) continue;
      result[key] = item;
      continue;
    }

    // Ko'p tilli maydon: hech bir tilda matn bo'lmasa, umuman yuborilmaydi.
    if (isLocalizedLike(item)) {
      const filled = Object.entries(item).filter(
        ([, text]) => typeof text === 'string' && text.trim().length > 0,
      );

      if (filled.length === 0) continue;
      result[key] = Object.fromEntries(filled);
      continue;
    }

    result[key] = item;
  }

  return result;
}

/** `{ uz, ru, en }` shaklidagi obyektmi. */
function isLocalizedLike(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const keys = Object.keys(value);

  return keys.length > 0 && keys.every((key) => ['uz', 'ru', 'en'].includes(key));
}
