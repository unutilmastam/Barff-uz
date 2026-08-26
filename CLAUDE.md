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
app/         Next.js App Router (sahifalar, layout, fonts.ts)
components/  layout/ ui/ sections/ animation/ products/ hero/ providers/
data/        kontent va tarjimalar (locales/) — komponentda hardcode YO'Q
lib/         types.ts, motion.ts, animations.ts, gsap.ts, i18n.ts, locale-store.ts,
             smooth-scroll.ts, utils.ts
hooks/       qayta ishlatiladigan React hook'lar
styles/      globals.css (design system tokenlari)
public/      images/ products/ fruits/ videos/ textures/ icons/ fonts/
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
- Sinov sahifasi: `/dev-motion` (noindex). Phase 4 tugagach o'chiriladi.
- Tailwind'da media-query variantini **arbitrary** ko'rinishda yozmang
  (`[@media(hover:hover)and(pointer:fine)]` — bo'shliqlar yo'qolib CSS yaroqsiz bo'ladi).
  `globals.css` dagi `@custom-variant pointer-fine` ishlatiladi.

## Til tizimi (i18n)

- Lug'atlar: `data/locales/{uz,ru,en}.ts`. `uz.ts` — manba nusxa, `Dictionary` tipi shundan
  chiqadi; `ru`/`en` tuzilmani buzsa kompilyator xato beradi.
- Komponentda: `const { t } = useLocale()` → `t.nav.products`. String kalit ham,
  har til uchun alohida komponent ham YO'Q.
- Til holati `lib/locale-store.ts` da (`useSyncExternalStore`): server har doim `uz` beradi,
  brauzer `localStorage` dagi tanlovni — shu sababli sahifalar statik qolaveradi va
  hydration xatosi bo'lmaydi.
- Navigatsiya `data/navigation.ts` da `labelKey` saqlaydi, matn emas.

## Kontent chegarasi (eng muhim qoida)

BARFF haqida hech narsa **o'ylab topilmaydi**: tarix, sertifikat, ta'rkib, kaloriya,
manzil, telefon, do'konlar, mukofotlar, mahsulot nomlari, brend ranglari.
Ma'lumot yetishmasa — `[CLIENT CONTENT REQUIRED]` yoziladi va `BUILD_PLAN.md` ning
"3. OCHIQ SAVOLLAR" bo'limiga qo'shiladi. Boshqa saytdan asset ko'chirilmaydi.
