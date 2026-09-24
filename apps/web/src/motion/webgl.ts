/**
 * WebGL mavjudligini tekshiradi.
 *
 * NEGA kerak: WebGL hamma joyda ishlamaydi — eski brauzer, o'chirilgan
 * apparat tezlashtirish, korporativ siyosat yoki virtual mashina.
 * Bunday holatda sahna qora to'rtburchak bo'lib qolardi, shuning uchun
 * oldindan tekshirib, zaxira kompozitsiyaga o'tiladi.
 *
 * Natija eslab qolinadi: har chaqiruvda yangi kontekst yaratish qimmat,
 * va brauzerda bir vaqtda ochiq bo'lishi mumkin bo'lgan WebGL
 * kontekstlari soni cheklangan.
 */
let cached: boolean | undefined;

export function hasWebGL(): boolean {
  if (cached !== undefined) return cached;
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');

    cached = context !== null;

    // Sinov konteksti darhol bo'shatiladi.
    if (context !== null) {
      const lose = context.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
  } catch {
    cached = false;
  }

  return cached;
}
