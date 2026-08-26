'use client';

/**
 * Sahifaning `<h1>` i.
 *
 * `/about`, `/story`, `/contact` bosh sahifadagi bo'limlarni QAYTA ISHLATADI, ulardagi
 * sarlavhalar esa `<h2>` — chunki bosh sahifada `<h1>` Hero'da. Natijada bu sahifalarda
 * `<h1>` umuman qolmasdi: hujjat tuzilmasi buziladi va ekran o'quvchi sahifa nomini
 * e'lon qilmaydi.
 *
 * Matn vizual takrorlanmasligi uchun `sr-only` — u allaqachon bo'lim ichida ko'rinadi.
 */
export function PageHeading({ children }: { children: string }) {
  return <h1 className="sr-only">{children}</h1>;
}
