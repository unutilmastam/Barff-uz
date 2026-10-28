/**
 * Hajmni ko'rsatish (o'zbekcha): 350 -> "350 ml", 1000 -> "1 L", 1500 -> "1,5 L".
 *
 * Bazada hajm millilitrda BUTUN son (aniq va solishtirishga qulay);
 * litrga aylantirish faqat ko'rinish uchun. Ommaviy saytda til bo'yicha
 * birlik kerak (`apps/web/src/lib/localized.ts`), diler va admin
 * ilovalari esa faqat o'zbekcha.
 */
export function formatVolumeMl(volumeMl: number): string {
  if (volumeMl >= 1000) {
    return `${String(volumeMl / 1000).replace('.', ',')} L`;
  }

  return `${volumeMl} ml`;
}
