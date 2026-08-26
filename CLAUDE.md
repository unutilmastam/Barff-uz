# CLAUDE.md — BARFF.UZ

> Har sessiya boshida avval shu fayl, keyin `BUILD_PLAN.md` o'qiladi.
> **Ish tartibi va qattiq qoidalar `BUILD_PLAN.md` → "0. CLAUDE CODE UCHUN QATTIQ QOIDALAR" bo'limida.**
> Ziddiyat bo'lsa — `BUILD_PLAN.md` ustun.

## Loyiha

BARFF — tabiiy sok/ichimlik brendi. Bu repo brendning rasmiy sayti (`barff.uz`).
Sayt bosqichma-bosqich quriladi; joriy bosqich `BUILD_PLAN.md` dagi `IN PROGRESS` belgisi bilan aniqlanadi.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** — konfiguratsiya CSS ichida (`@theme`), `tailwind.config` fayli YO'Q
- **GSAP** (+ ScrollTrigger) — asosiy scroll animatsiyalari
- **Lenis** — smooth scroll
- **framer-motion** — komponent darajasidagi holat animatsiyalari
- **lucide-react** — ikonkalar
- Shriftlar: `next/font/google` — Manrope (display) + Inter (body)

## Papka tartibi

```
app/         Next.js App Router. Marshrutlar: / · /products · /products/[slug] ·
             /news · /news/[slug] · /about · /story · /contact (+ not-found holatlari)
components/  layout/ ui/ sections/ animation/ products/ hero/ providers/
data/        kontent va tarjimalar (locales/) — komponentda hardcode YO'Q
lib/         types.ts, motion.ts, animations.ts, gsap.ts, i18n.ts, locale-store.ts,
             intro-store.ts, smooth-scroll.ts, content.ts, utils.ts
hooks/       qayta ishlatiladigan React hook'lar
styles/      globals.css (design system tokenlari)
public/      images/ products/ fruits/ videos/ textures/ icons/ fonts/
             `placeholder-*.svg` — VAQTINCHALIK maketlar, mijoz assetlari kelgach o'chiriladi
```

`index.html` va `CNAME` — hozirgi jonli "tez orada" sahifasi (GitHub Pages).
Next.js build'iga aloqasi yo'q; almashtirish vaqtini mijoz hal qiladi. **Tegilmaydi.**

## Buyruqlar

```bash
npm run dev        # ishlab chiqish serveri
npm run lint       # ESLint (flat config)
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Har bosqich oxirida `npm run lint && npm run build` majburiy va toza bo'lishi shart.

## Kod konvensiyalari

- **Import alias:** `@/` → loyiha ildizi (`@/lib/types`, `@/data/products`).
- **Design tokenlar:** ranglar, radiuslar, typography — faqat `styles/globals.css` dagi `@theme` orqali. Komponentda xom HEX yozilmaydi.
- **Motion:** har bir davomiylik/easing `lib/motion.ts` dan olinadi. "Sehrli raqam" (`0.7`, `"power3.out"`) komponent ichida yozilmaydi.
- **GSAP:** har animatsiya `gsap.context()` ichida, `useEffect` cleanup'da `ctx.revert()`.
- **Kontent:** matn, sana, raqam — `data/` dan. Ma'lumot yo'q joyda `[CLIENT CONTENT REQUIRED]`.
- **Fayl hajmi:** bitta komponent = bitta vazifa. 1000 qatorlik fayl yo'q.
- `prefers-reduced-motion` hurmat qilinadi — `usePrefersReducedMotion()` orqali.
- **Effekt ichida `setState` yozilmaydi** (`react-hooks/set-state-in-effect` xato beradi).
  Tashqi holat uchun `useSyncExternalStore` (`useIsClient`, `usePrefersReducedMotion`,
  `localeStore`), prop'dan kelib chiqadigan holat uchun render paytida moslashtirish
  (`useAnimatedPresence`) ishlatiladi.
- Uzluksiz yangilanadigan animatsiyada (masalan Header scroll) `gsap.context()` har holat
  o'zgarishida qayta yaratilmaydi — bir marta quriladi, keyin `gsap.quickTo()` setter'i
  chaqiriladi. Aks holda ishlayotgan tween uzilib, element yarim yo'lda qotib qoladi.

## Motion tizimi

- GSAP va plaginlar **faqat `@/lib/gsap`** dan import qilinadi (`import { gsap, ScrollTrigger }`).
  To'g'ridan-to'g'ri `from 'gsap'` yozilmaydi — plagin ro'yxatdan o'tmay qoladi.
- Animatsiya retseptlari `lib/animations.ts` da: `fadeUp`, `revealText`, `imageReveal`,
  `parallax`, `magnetic`, `horizontalScroll`, `pageTransition`. Yangi bo'lim uchun avval
  shu yerga qaraladi, komponent ichida yangi timeline yozilmaydi.
- **Lenis sinxronizatsiyasi** (`SmoothScrollProvider.tsx`) uchta shartga tayanadi va ular
  buzilsa double-scroll bug qaytadi: Lenis `autoRaf: false` (rAF ni faqat `gsap.ticker`
  yuritadi), `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`.
  `globals.css` dagi `html.lenis` qoidalari ham majburiy.
- Overlay ochilganda `useLockBodyScroll` Lenis'ni to'xtatadi — `overflow: hidden` yolg'iz
  o'zi yetarli emas.
- Sinov sahifasi `/dev-motion` Phase 4 tugagach o'chirildi (kerak bo'lsa git tarixidan olinadi).
- Kirish animatsiyalari Loader tugashini kutadi: `useIntroFinished()` / `lib/intro-store.ts`.
  Aks holda ular loader ortida o'ynab tugaydi.
- Tailwind'da media-query variantini **arbitrary** ko'rinishda yozmang
  (`[@media(hover:hover)and(pointer:fine)]` — bo'shliqlar yo'qolib CSS yaroqsiz bo'ladi).
  `globals.css` dagi `@custom-variant pointer-fine` ishlatiladi.

## ScrollTrigger `pin` uchun uchta qoida

Bular buzilsa pin jimgina ishlamay qo'yadi — build ham, lint ham xato bermaydi:

1. **Pin qilinadigan element FLEX konteynerning bevosita farzandi bo'lmasin.** GSAP pin-spacer'ga
   `padding-bottom` qo'shadi, flex uni hisobga olmaydi va sahifada joy ochilmaydi — pin hech
   qachon tugamaydi, bo'lim footer ustida yopishib qoladi. Shu sababli `#main-content` va
   `<main>` blok, pin esa bo'lim ichidagi alohida `<div>` ga biriktiriladi.
2. **Yashirin elementda pin qurilmaydi.** `display:none` bo'lgan tarmoqning `scrollWidth` i 0 —
   bo'sh pin-spacer qoladi. `HorizontalScroll` buni o'zi tekshiradi (`offsetParent === null`).
3. **Layout hydration'dan keyin o'zgarmasin.** Desktop/mobil tarmoqlari CSS (`hidden md:block`)
   bilan ajratiladi, media query hook bilan EMAS: hook ishlatilsa tarmoq kech mount bo'lib
   sahifa balandligini o'zgartiradi va undan keyingi ScrollTrigger'larning boshlanish
   nuqtalari eskirib qoladi.

Grid item ichida **foizli balandlik** (`h-[78%]`) ham ishonchsiz — rasm konteynerdan kattaroq
render bo'lib kesiladi. Aniq o'lchamli absolyut o'ram + `object-contain` ishlatiladi.

## Tailwind v4 — ikkita tuzoq

- **`transform` emas, `translate` / `rotate` / `scale`.** Tailwind v4 alohida CSS xossalarini
  yozadi. Test yoki debug paytida `getComputedStyle(el).transform` ni o'qish `none` qaytaradi,
  garchi element siljigan bo'lsa ham — `getComputedStyle(el).translate` o'qiladi.
- **Maxsus variantni boshqa variant bilan stack qilmang.** `pointer-fine:group-hover:...` da
  media-query jimgina tushib qoladi (`@media` generatsiya qilinmaydi). Bitta variant sifatida
  ishlatilsa (`pointer-fine:flex`) to'g'ri ishlaydi.

## Krossfeyd o'tishlari

Ikkita element bir-birini almashtirganda (FRUIT → BOTTLE, ProductShowcase) so'nish va ochilish
uchun **`ease: none`** ishlatiladi va vaqtlar ustma-ust qo'yiladi. `inOut` egri chizig'i
o'rtada tez o'zgargani uchun ikkala element past opacity nuqtasida kesishadi va ekranda
"o'lik zona" — bo'shliq paydo bo'ladi.

## Til tizimi (i18n)

- Lug'atlar: `data/locales/{uz,ru,en}.ts`. `uz.ts` — manba nusxa, `Dictionary` tipi shundan
  chiqadi; `ru`/`en` tuzilmani buzsa kompilyator xato beradi.
- Komponentda: `const { t } = useLocale()` → `t.nav.products`. String kalit ham,
  har til uchun alohida komponent ham YO'Q.
- Til holati `lib/locale-store.ts` da (`useSyncExternalStore`): server har doim `uz` beradi,
  brauzer `localStorage` dagi tanlovni — shu sababli sahifalar statik qolaveradi va
  hydration xatosi bo'lmaydi.
- Navigatsiya `data/navigation.ts` da `labelKey` saqlaydi, matn emas.

## Vaqtinchalik kontent holati

Mijoz ko'rsatmasi bilan sayt hozircha PLACEHOLDER kontent bilan to'ldirilgan:
`data/products.ts`, `data/categories.ts`, `data/hero.ts` va `public/{products,fruits}/`.
Bular **almashtirilishi shart** — ro'yxat `BUILD_PLAN.md` → "3. OCHIQ SAVOLLAR" da.

Placeholder yozishning qoidalari o'zgarmadi:
- nomlar neytral ("MAHSULOT 01"), ta'm nomi yoki shior o'ylab topilmaydi;
- `ingredients`, `nutrition`, `packaging` BO'SH qoladi — ular mahsulot da'volari;
- rasmlar faqat shu loyiha uchun chiziladi, boshqa saytdan ko'chirilmaydi (9-qoida);
- shisha yorlig'ida "PLACEHOLDER" yozuvi bor, ya'ni real foto bilan adashtirilmaydi.

## Video va maxfiy kalitlar

- Videolar `public/videos/` da (`placeholder-*.webm` — vaqtinchalik), posterlar
  `public/images/` da. `<video>` har doim `muted` + `playsInline` + `poster` bilan.
- **Avtoplay `autoPlay` atributi bilan boshlanmaydi.** U faqat element yuklanayotganda
  o'qiladi, biz esa qiymatni hydration'dan keyin bilamiz — natijada video umuman
  o'ynamay qoladi. `IntersectionObserver` + `video.play()` ishlatiladi, shu bilan birga
  video faqat ekranda ko'rinib turganda o'ynaydi.
- Mobilda va `prefers-reduced-motion` rejimida video avtomatik o'ynamaydi — poster qoladi.
- **Maxfiy kalitlar kodga yozilmaydi.** Aloqa formasi manzili `NEXT_PUBLIC_CONTACT_ENDPOINT`
  dan olinadi (`lib/contact.ts`, namuna `.env.example` da). `NEXT_PUBLIC_` brauzerga
  chiqadi — u yerga faqat OCHIQ endpoint qo'yiladi; bot tokeni yoki API kalit server
  tomonda, prefikssiz saqlanadi.
- Endpoint sozlanmagan bo'lsa forma soxta "muvaffaqiyat" ko'rsatmaydi — aniq xabar beradi.

## Ichki sahifalar

- `[slug]` marshrutlari `generateStaticParams` bilan build paytida generatsiya qilinadi;
  topilmagan slug `notFound()` ga boradi va segmentdagi `not-found.tsx` ko'rsatiladi.
- `/about`, `/story`, `/contact` bosh sahifadagi bo'limlarni QAYTA ISHLATADI — matn ikki
  nusxada saqlanmaydi.
- **Har sahifada aynan bitta `<h1>` bo'lishi shart.** Bo'limlar bosh sahifada `<h2>`
  ishlatadi (chunki `<h1>` Hero'da), shuning uchun ularni qayta ishlatuvchi sahifalarga
  `PageTitle` (`sr-only <h1>`) qo'shiladi.

## Responsive qoidalari

- Breakpointlar: 320–479 · 480–767 · 768–1023 · 1024–1439 · 1440+.
- **320–479px uchun typography poli alohida.** `globals.css` da shu oraliqda
  `--text-hero` / `--text-section` / `--text-title` pasaytiriladi: spec'dagi `4rem` pol
  320px da hero'ni 100vh dan chiqarib yuboradi. 480px dan spec qiymatlari qaytadi.
- **Balandligi cheklangan joyda rasmni KENGLIK bo'yicha o'lchamang.** Shisha 400:720
  nisbatda — `w-[26rem]` balandlikni 749px qiladi va hero 100vh dan oshadi.
  Desktopda `h-[min(60vh,30rem)] w-auto` ishlatiladi.
- **CSS bilan yashirilgan tarmoq baribir mount bo'ladi.** `hidden md:block` ichidagi
  GSAP komponentlari mobilda ham ishlaydi. Har bunday komponent `offsetParent === null`
  bo'lsa o'zini o'chirishi kerak (`HorizontalScroll`, `FloatingFruit`).
- Mobilda parallaks `PARALLAX.mobileFactor` ga kamaytiriladi; `parallax()` buni
  `gsap.matchMedia` orqali qiladi, shuning uchun oyna o'lchami o'zgarganda o'zi moslashadi.
- Tegish maydoni kamida 40–44px.

## SEO

- `lib/seo.ts` — `SITE_URL`, `pageMetadata()` (canonical + OG + Twitter). Har sahifa
  o'z `metadata` sini shundan yasaydi; sarlavha shabloni `%s — BARFF`.
- **Structured data'ga faqat TASDIQLANGAN ma'lumot yoziladi.** Narx, mavjudlik, reyting,
  manzil, telefon — ma'lum emas, shuning uchun JSON-LD ga ham qo'shilmaydi. Noto'g'ri
  structured data uchun qidiruv tizimlari sahifani jazolaydi.
- **Indekslash standart holatda O'CHIQ** (`NEXT_PUBLIC_ALLOW_INDEXING`). Placeholder
  kontent qidiruvga tushmasligi kerak. Ishga tushirish kuni `.env` da yoqiladi.
- Til klientda saqlanadi, alohida URL yo'q → `hreflang` qo'yilmagan, metadata `uz` da.

## Kontent chegarasi (eng muhim qoida)

BARFF haqida hech narsa **o'ylab topilmaydi**: tarix, sertifikat, ta'rkib, kaloriya,
manzil, telefon, do'konlar, mukofotlar, mahsulot nomlari, brend ranglari.
Ma'lumot yetishmasa — `[CLIENT CONTENT REQUIRED]` yoziladi va `BUILD_PLAN.md` ning
"3. OCHIQ SAVOLLAR" bo'limiga qo'shiladi. Boshqa saytdan asset ko'chirilmaydi.
