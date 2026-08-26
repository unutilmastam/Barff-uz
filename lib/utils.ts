/** Shartli class nomlarini birlashtiradi (`clsx` o'rniga — qo'shimcha bog'liqliksiz). */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** Havola tashqi manzilgami? (`next/link` faqat ichki havolalar uchun.) */
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}
