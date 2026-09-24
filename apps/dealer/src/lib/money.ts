import { formatMoney as sharedFormatMoney } from '@barff/utils';

/**
 * Pul — TIYINDA keladi, so'mda ko'rsatiladi.
 *
 * HISOB BU YERDA YO'Q: u serverda (`price-resolver.ts`). Bu faqat
 * ko'rsatish qatlami.
 *
 * Formatlash `@barff/utils` dagi YAGONA funksiyadan. `Intl` ning
 * `style: 'currency'` i ATAYLAB ishlatilmaydi — u muhitga bog'liq
 * natija beradi (Node `900 soʻm`, Chromium `UZS 900`), ya'ni
 * serverda chizilgan narx brauzerda boshqacha ko'rinardi.
 *
 * Katalog va savatda tiyin KO'RSATILMAYDI (`0`): u faqat hisobda
 * ma'noli, dilerga esa shovqin.
 */
export function formatMoney(tiyin: number, currency = 'UZS'): string {
  return sharedFormatMoney({ amount: tiyin, currency: currency as 'UZS' }, 'uz-UZ', 0);
}

/** Chegirma foizi — KO'RSATISH uchun (bazis punktdan). */
export function formatPercent(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
}
