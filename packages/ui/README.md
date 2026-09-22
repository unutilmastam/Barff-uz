# @barff/ui

BARFF dizayn tizimi. Ranglar va tipografika **bu yerda emas** —
`@barff/config/tailwind/theme.css` da; bu paket faqat shu tokenlarni
ishlatadigan komponentlarni beradi.

## Manba ko'rinishida tarqatiladi

Paket kompilyatsiya qilinmaydi: `main` to'g'ridan-to'g'ri `src/index.ts` ga
qaraydi va ilovalar uni `transpilePackages` orqali o'zi kompilyatsiya
qiladi. Shu sababli CJS/ESM chalkashligi ham, alohida build bosqichi ham
yo'q.

Ilovaning `globals.css` fayli `@source` bilan shu paketni ko'rsatishi
shart, aks holda Tailwind bu yerdagi sinflarni topmaydi va uslublar
yo'qoladi.

## Radix nega ishlatiladi

Dialog, Sheet, Tabs, Accordion, Select va Checkbox — Radix ustiga qurilgan.
Fokus tutqichi, `Escape` bilan yopish, skrollni bloklash, `aria-modal`,
fokusni qaytarish kabi narsalarni qo'lda yozish xatoga juda moyil.
Qolgan primitivlar (Button, Badge, Input, Textarea, Skeleton, Pagination)
qo'shimcha kutubxonasiz.

## Ko'rish

`apps/web` dagi `/uz/dev/ui` sahifasi barcha komponentlarni ko'rsatadi.
U production build'da ochilmaydi.
