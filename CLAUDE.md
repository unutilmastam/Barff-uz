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
components/  layout/ ui/ sections/ animation/ products/ hero/
data/        kontent va tarjimalar (locales/) — komponentda hardcode YO'Q
lib/         types.ts, motion.ts, animations.ts, i18n.ts
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
- `prefers-reduced-motion` hurmat qilinadi.

## Kontent chegarasi (eng muhim qoida)

BARFF haqida hech narsa **o'ylab topilmaydi**: tarix, sertifikat, ta'rkib, kaloriya,
manzil, telefon, do'konlar, mukofotlar, mahsulot nomlari, brend ranglari.
Ma'lumot yetishmasa — `[CLIENT CONTENT REQUIRED]` yoziladi va `BUILD_PLAN.md` ning
"3. OCHIQ SAVOLLAR" bo'limiga qo'shiladi. Boshqa saytdan asset ko'chirilmaydi.
