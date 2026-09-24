# QA TO'PLAMI

Bu skriptlar ilovani **haqiqiy brauzerda** tekshiradi — koddan o'qib
xulosa qilmaydi. `ROADMAP.md` S21 (Faza 1 darvozasi) shu to'plam bilan
yopilgan; natijalar `docs/RELEASE-P1.md` da.

## Nega alohida, pnpm workspace'dan TASHQARIDA

`qa/` ataylab `pnpm-workspace.yaml` ga kiritilmagan. Playwright va
brauzer binarlari og'ir; ularni har bir `pnpm install` ga va CI'ga
yuklash bu tekshiruvlardan keladigan foydadan qimmat. Shuning uchun
bog'liqliklar FAQAT shu katalogda, qo'lda o'rnatiladi.

```bash
cd qa && npm install
```

## Ishga tushirishdan oldin

Uchala xizmat ishlab turishi kerak:

| Xizmat | Port | Buyruq                                       |
| ------ | ---- | -------------------------------------------- |
| API    | 3000 | `pnpm --filter @barff/api start`             |
| Sayt   | 3001 | `pnpm --filter @barff/web start`             |
| Admin  | 3002 | `PORT=3002 pnpm --filter @barff/admin start` |

Shuningdek PostgreSQL va Redis (`docker compose up -d`).

Brauzer yo'li `CHROMIUM_PATH` dan olinadi; berilmasa Playwright o'z
brauzerini ishlatadi.

## IKKI TUZOQ (ikkalasi ham o'lchab aniqlangan)

**1. Qayta qurgandan keyin serverni ham qayta ishga tushiring.**
`next build` dan keyin eski `next start` jarayoni HTML ichida ESKI
chunk nomini berishda davom etadi. U fayl diskda yo'q → `400` →
React gidratsiyasi butun sahifani xato ekraniga almashtiradi. Natija
chalg'itadi: `curl` sahifani TO'G'RI ko'rsatadi (server HTML joyida),
brauzerda esa forma UMUMAN yo'q. Bu "ilova buzilgan" degan noto'g'ri
xulosaga olib keldi.

**2. `POST /leads` soatiga 5 ta.** Bu spamga qarshi TO'G'RI cheklov
(S14), lekin sinovni takroran yurgizganda `429` beradi. API jarayonini
qayta ishga tushirish hisobni nolga qaytaradi — cheklov instansiya
xotirasida. `e2e-phase1.mjs` javob statusini ham chop etadi, shuning
uchun bu holat "ilova ishlamayapti" bilan adashtirilmaydi.

## Skriptlar

| Skript                  | Nimani o'lchaydi                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm run e2e`           | Uchta kritik oqim (`CLAUDE.md` §24): B2B ariza, admin kirishi, admin tahriri saytda          |
| `npm run perf`          | LCP / CLS / FCP / TTFB, bayt byudjeti, 3D va GSAP kechiktirilganmi                           |
| `npm run a11y`          | axe-core WCAG 2.1 A+AA, 15 marshrut × 2 o'lcham × **2 ko'rinish**, gorizontal skroll, `<h1>` |
| `npm run a11y:keyboard` | Klaviatura bilan yurish, fokus ko'rinishi va tartibi, `alt`, `html lang`                     |
| `npm run theme`         | Ko'rinish almashtirgichi: tanlov, eslab qolish, FOUC, xotira bloklangan holat                |
| `npm run all`           | Hammasi ketma-ket                                                                            |

`npm run a11y -- <katalog>` ekran nusxalarini ham saqlaydi.

## O'LCHOV USULI HAQIDA

Bu skriptlar yozilishda **uchta yolg'on ayblov** berdi va ularning
har biri tuzatildi. Yangi tekshiruv qo'shganda shu xatolarni
takrorlamaslik uchun:

1. **Bayt hajmi `content-length` dan olinmaydi.** Siqilgan yoki
   `chunked` javobda u yo'q va yig'indi nolga yaqin chiqadi.
   `PerformanceResourceTiming.encodedBodySize` ishlatiladi.

2. **"Kechiktirilganmi" vaqt oynasi bilan o'lchanmaydi.** `localhost`
   da dinamik import ham yuklanish boshlangandan keyingi 400 ms
   ichida ulguradi. Dastlabki bundle — bu server qaytargan HTML
   ichidagi `<script src>` teglari, boshqa hech narsa emas.

3. **Kutubxona NOMI bo'yicha qidirilmaydi.** `ScrollTrigger` so'zi
   dinamik importning o'zida (`await import('gsap/ScrollTrigger')`),
   `registerPlugin(` esa import'dan keyingi o'z kodimizda uchraydi —
   ikkalasi ham kechiktirish KODI, kutubxonaning o'zi emas.
   Kutubxona ichki belgisi qidiriladi (`gsap.core`, `_gsap`,
   `CSSPlugin`, `WebGLRenderer`).

Xuddi shu sabab bilan fokus tartibi PIKSEL koordinatasi bilan
o'lchanmaydi: ustunli futerda ikkinchi ustun sahifaning yuqorisidan
boshlanadi va har doim "orqaga sakrash" bo'lib ko'rinadi — bu esa
to'g'ri tartib. Fokus OLDINGI BO'LIMga qaytmasligi tekshiriladi.
