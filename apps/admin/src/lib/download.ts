/**
 * Faylni YUKLAB OLISH — oddiy havola bilan emas.
 *
 * Autentifikatsiya HttpOnly cookie'da (S04). Oddiy `<a href>`
 * boshqa manzilga (`api.barff.uz`) o'tishdir va cookie u yerga
 * `SameSite` qoidasiga qarab boradi — ya'ni yuklab olish
 * BRAUZER SOZLAMASIGA bog'liq bo'lib qolardi va nosozlik faqat
 * ba'zi foydalanuvchilarda ko'rinardi.
 *
 * Shuning uchun fayl `credentials: 'include'` bilan olinadi va
 * `Blob` orqali saqlanadi: xatti-harakat hamma joyda bir xil va
 * xato bo'lsa u KO'RINADI.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const base = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';

  const response = await fetch(`${base}${path}`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Yuklab bo‘lmadi (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  // Xotira bo'shatiladi — aks holda har yuklashda `Blob` qolib ketardi.
  URL.revokeObjectURL(url);
}
