# BARFF.UZ — BUILD PLAN / BOSQICHLI QURILISH REJASI

> **Bu fayl loyihaning yagona boshqaruv nuqtasi.**
> Claude Code har sessiyada avval shu faylni o'qiydi, keyin ish boshlaydi.

---

## 0. CLAUDE CODE UCHUN QATTIQ QOIDALAR

Bu qoidalar barcha bosqichlarda amal qiladi. Hech qachon buzilmaydi.

1. **Sessiya boshida:** avval `BUILD_PLAN.md` va `CLAUDE.md` fayllarini o'qi.
2. **Faqat bitta bosqich:** `IN PROGRESS` deb belgilangan eng birinchi bosqichni bajar. Keyingi bosqichlarga OLDINDAN tegma.
3. **Mavjud kodni tekshir:** yangi fayl yaratishdan oldin loyihada nima borligini ko'r. Foydali kodni sababsiz o'chirma yoki qayta yozma.
4. **Bosqich tugagach majburiy:**
   ```bash
   npm run lint
   npm run build
   ```
   Xatolar bo'lsa — o'zing tuzat, keyin qaytadan ishga tushir.
5. **Faylni yangila:** bosqich muvaffaqiyatli tugagach shu faylda:
   - `- [ ]` ni `- [x]` ga o'zgartir
   - status'ni `IN PROGRESS` → `✅ BAJARILDI (sana)` qil
   - keyingi bosqichning status'ini `IN PROGRESS` qil
   - "BAJARILGAN ISHLAR JURNALI" bo'limiga qisqa yozuv qo'sh
6. **Commit:** `git add -A && git commit -m "Phase N: <qisqa tavsif>"` va push.
7. **Sessiya oxirida to'xta va so'ra:**
   > "Phase N tugadi. Build va lint toza. Phase N+1 ni boshlaymi?"
   Tasdiq olmaguncha keyingi bosqichni BOSHLAMA.
8. **Kontent qoidasi:** BARFF haqida hech narsani o'ylab topma — tarix, sertifikat, ta'rkib, kaloriya, manzil, telefon, do'konlar, mukofotlar. Ma'lumot yo'q joyda `[CLIENT CONTENT REQUIRED]` yoz.
9. **Asset qoidasi:** boshqa saytdan rasm, matn, CSS, brending ko'chirma. Faqat placeholder yoki mijoz bergan fayllar.
10. **Kod sifati:** 1000 qatorlik bitta fayl yo'q. Qayta ishlatiladigan modullar. Har GSAP animatsiyasi `gsap.context()` ichida va unmount'da tozalanadi.
11. **Vizual ierarxiya:** har bo'limda PRIMARY (sarlavha/mahsulot) → SECONDARY (matn/CTA) → DECORATIVE (meva/zarrachalar). Dekor hech qachon mahsulotni bosib ketmaydi.
12. **Animatsiya ierarxiyasi:** hamma narsa bir vaqtda animatsiya qilinmaydi. Tartib: mahsulot → sarlavha → asosiy rasm → ikkilamchi matn → dekor.
13. **Interaksiya qoidasi:** har animatsiyaning UX sababi bo'lsin. Sababsiz aylanish, sakrash, kattalashish, miltillash — TAQIQLANADI.
14. **3D:** React Three Fiber faqat haqiqiy 3D model bo'lsa. Model yo'q bo'lsa — soxta murakkab 3D tizim QURILMAYDI, shaffof fonli foto + GSAP transform ishlatiladi.

---

## 1. UMUMIY HOLAT

| Bosqich | Nomi | Holat |
|---------|------|-------|
| 1 | Setup & Design System | ✅ BAJARILDI (2026-08-26) |
| 2 | Layout (Header / Menu / Footer) | ✅ BAJARILDI (2026-08-26) |
| 3 | Motion System | ✅ BAJARILDI (2026-08-26) |
| 4 | Hero | ✅ BAJARILDI (2026-08-26) |
| 5 | Marquee / Categories / Showcase | **IN PROGRESS** |
| 6 | Philosophy / About / Story / Process | KUTMOQDA |
| 7 | Video / Reels / News / WhereToBuy / Contact | KUTMOQDA |
| 8 | Ichki sahifalar | KUTMOQDA |
| 9 | Responsive | KUTMOQDA |
| 10 | SEO | KUTMOQDA |
| 11 | Performance | KUTMOQDA |
| 12 | Final Polish | KUTMOQDA |

---

## PHASE 1 — SETUP & DESIGN SYSTEM

**Status:** ✅ BAJARILDI (2026-08-26)

- [x] Next.js (latest stable) + TypeScript + Tailwind CSS loyihasi
- [x] Dependencies: `gsap`, `lenis`, `framer-motion`, `lucide-react`
- [x] Papka strukturasi: `app/`, `components/`, `data/`, `lib/`, `hooks/`, `styles/`, `public/`
- [x] `public/` ichida: `images/`, `products/`, `fruits/`, `videos/`, `textures/`, `icons/`, `fonts/`
- [x] `globals.css` — CSS o'zgaruvchilar (`--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--radius-*`, `--container`)
- [x] Typography: display shrift (Satoshi / Geist / Manrope) + body shrift (Inter / Geist Sans), `next/font` orqali
- [x] Typography scale: hero `clamp(4rem, 10vw, 12rem)`, section `clamp(3rem, 7vw, 9rem)`, body 16–22px
- [x] Responsive container utility: `width: min(100% - 40px, 1600px); margin-inline: auto;`
- [x] `lib/motion.ts` — global motion konstantalari (micro 250–400ms, ui 400–700ms, section 800–1200ms, hero 1000–2000ms; easing: power2/3/4.out, expo.out)
- [x] Bo'sh tiplangan data fayllari: `data/products.ts`, `categories.ts`, `news.ts`, `navigation.ts`, `social.ts`
- [x] `Product` tipi spec'dagidek yozilgan
- [x] `package.json` da `lint` va `build` scriptlari mavjud
- [x] `npm run lint && npm run build` — toza

**MUHIM:** bu bosqichda Header, Hero yoki boshqa vizual komponentlar qurilmaydi.

---

## PHASE 2 — LAYOUT

**Status:** ✅ BAJARILDI (2026-08-26)

- [x] `components/layout/Header.tsx` — shaffof boshlanadi, scroll'dan keyin blur + kichrayadi
- [x] Header scroll xatti-harakati: pastga → yashirin, tepaga → ko'rinadi (GSAP)
- [x] `components/layout/MobileMenu.tsx` — to'liq ekran overlay, clip-path, stagger, katta typography (side drawer EMAS)
- [x] `components/layout/Footer.tsx` — ulkan BARFF logotipi, navigatsiya, ijtimoiy havolalar (faqat mavjudlari)
- [x] `components/layout/PageTransition.tsx` — brend rangli overlay, 500–900ms
- [x] `components/ui/Loader.tsx` — `BARFF 0% → 100%`, maks 1–1.5s, takroriy navigatsiyada qisqaroq
- [x] `components/ui/LanguageSwitcher.tsx` — UZ / RU / EN
- [x] `lib/i18n.ts` + `data/locales/{uz,ru,en}.ts` — tarjima arxitekturasi. Har til uchun alohida komponent nusxasi QILINMAYDI
- [x] `components/ui/Button.tsx` — variantlar bilan
- [x] `components/ui/Modal.tsx` — qayta ishlatiladigan, focus trap bilan
- [x] `data/navigation.ts` dan menyu o'qiladi (hardcode EMAS)
- [x] `prefers-reduced-motion` hurmat qilinadi
- [x] `npm run lint && npm run build` — toza

---

## PHASE 3 — MOTION SYSTEM

**Status:** ✅ BAJARILDI (2026-08-26)

- [x] Lenis + GSAP ticker + `ScrollTrigger.update()` to'g'ri sinxronlangan (double-scroll bug yo'q)
- [x] `components/animation/Reveal.tsx`
- [x] `components/animation/TextReveal.tsx` + `SplitText.tsx`
- [x] `components/animation/ImageReveal.tsx` — `scale 1.15` → clip-path reveal → `scale 1`
- [x] `components/animation/Parallax.tsx` — turli tezliklar (bg 0.1 / image 0.25 / fruit 0.45)
- [x] `components/animation/MagneticButton.tsx` — maks 8–15px siljish, spring qaytish
- [x] `components/sections/Marquee.tsx` — cheksiz loop, hover'da sekinlashadi (to'xtamaydi)
- [x] `components/animation/HorizontalScroll.tsx` — pin + dinamik kenglik hisobi
- [x] `components/ui/Cursor.tsx` — faqat desktop; OPEN → / VIEW / PLAY / DRAG ↔ holatlari
- [x] `lib/animations.ts` — `fadeUp()`, `revealText()`, `imageReveal()`, `parallax()`, `magnetic()`, `horizontalScroll()`, `pageTransition()`
- [x] Har bir animatsiya `gsap.context()` ichida, unmount'da `revert()`
- [x] Sinov sahifasi (`/dev-motion`) yaratilib, hammasi tekshirilgan
- [x] `npm run lint && npm run build` — toza

> Bu bosqich tugamaguncha Phase 4 ga o'tilmaydi. Motion tizimi butun saytning poydevori.

---

## PHASE 4 — HERO

**Status:** ✅ BAJARILDI (2026-08-26)

- [x] `components/hero/Hero.tsx` — ~100vh
- [x] Tuzilma: BARFF → sarlavha → mahsulot → tag'lar → scroll indikatori
- [x] `components/hero/HeroProduct.tsx` — float, subtle rotate, kursorga reaksiya (`mouseX → rotateY`, `mouseY → rotateX`, smoothing bilan)
- [x] `components/hero/FloatingFruit.tsx` — props: `src, x, y, scale, rotation, speed, parallax`
- [x] `components/hero/HeroParticles.tsx` (ixtiyoriy, ortiqcha shovqin bo'lmasin)
- [x] Timeline: 0.0s fon → 0.2s logo → 0.4s sarlavha → 0.6s stagger → 0.8s mahsulot (`scale 0.65→1`, `rotate -8°→0`) → 1.0s meva → 1.2s CTA → 1.5s float boshlanadi
- [x] Mahsulot har doim asosiy vizual fokus — dekor uni bosib ketmasin
- [x] Matnlar `data/` dan keladi va oson almashtiriladi
- [x] Mobil versiyasi alohida sozlangan (kam meva, sodda motion)
- [x] `npm run lint && npm run build` — toza

> **Hero "premium" his qilmaguncha keyingi bosqichga o'tilmaydi.**

---

## PHASE 5 — MARQUEE / CATEGORIES / PRODUCT SHOWCASE

**Status:** IN PROGRESS

- [ ] Kinetic Marquee — ulkan typography, cheksiz loop
- [ ] `components/sections/CategoriesSection.tsx` — `01 / 02 / 03 / 04` katta raqamlar, rasm, meva, sarlavha, qisqa matn, CTA
- [ ] Desktop: horizontal scroll; Mobil: vertikal touch-friendly kartalar
- [ ] `components/products/ProductShowcase.tsx` — scroll bo'ylab mahsulot, fon, meva, typography almashadi
- [ ] Mahsulot o'tishi: GSAP timeline, crossfade + scale + slight rotation + clip-path (keskin kesish YO'Q)
- [ ] `components/products/ProductCard.tsx`, `ProductGrid.tsx`
- [ ] Barcha ma'lumot `data/products.ts` va `data/categories.ts` dan (komponent ichida hardcode YO'Q)
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 6 — PHILOSOPHY / ABOUT / STORY / PROCESS

**Status:** KUTMOQDA

- [ ] `PhilosophySection.tsx` — 4 ta qiymat, hover'da rasm reveal, matn siljishi, strelka aylanishi
- [ ] **FRUIT → BOTTLE** bo'limi (bosh sahifa tartibida 08) — meva shishaga aylanadigan scroll-driven vizual o'tish
- [ ] `AboutSection.tsx` — katta editorial matn, har qator pastdan chiqadi (clip-path + transform, faqat opacity EMAS)
- [ ] `StorySection.tsx` — desktop horizontal timeline, mobil vertikal
- [ ] `ProcessSection.tsx` — FRUIT → SELECTION → PROCESS → QUALITY → BOTTLE, scroll-driven
- [ ] Sana, faktlar, ishlab chiqarish da'volari — `[CLIENT CONTENT REQUIRED]`
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 7 — VIDEO / REELS / NEWS / WHERE TO BUY / CONTACT

**Status:** KUTMOQDA

- [ ] `VideoSection.tsx` — full-width, muted, PLAY kursor, klikda fullscreen modal, mobil uchun poster
- [ ] `ReelsSection.tsx` — 9:16 kartalar, desktop horizontal scroll, mobil swipe, hover'da muted playback
- [ ] `NewsSection.tsx` — editorial kartalar, hover `scale(1.06)` + strelka rotate
- [ ] `WhereToBuy.tsx` — "FIND YOUR BARFF" CTA + mijoz bergan sotuv nuqtalari
- [ ] `ContactSection.tsx` — full-screen, forma (Name, Phone, Email, Message), validatsiya, `idle / loading / success / error`
- [ ] API kalitlari kodda ochiq turmasin — `.env` ishlatilsin
- [ ] Bosh sahifa tartibi spec'dagi 01–16 ketma-ketlikda yig'ilgan
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 8 — ICHKI SAHIFALAR

**Status:** KUTMOQDA

- [ ] `/products` — grid + `ProductFilter.tsx`
- [ ] `/products/[slug]` — hero, INGREDIENTS, NUTRITION, PACKAGING, RELATED PRODUCTS
- [ ] `components/products/ProductDetails.tsx`
- [ ] Qidiruv (mahsulot soni ko'p bo'lsa): desktop'da ikonka → to'liq ekran overlay, `SEARCH BARFF` input, natijada mahsulot + yangilik, Escape yopadi
- [ ] Mahsulot sahifasida kursorga reaksiya, ingredientlar mahsulot atrofida (ekran to'lib ketmasin)
- [ ] `/news` va `/news/[slug]` — sarlavha, sana, hero rasm, matn, o'xshash yangiliklar, orqaga tugmasi
- [ ] `/about`, `/story`, `/contact`
- [ ] `PRODUCT NOT FOUND` / `ARTICLE NOT FOUND` holatlari
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 9 — RESPONSIVE

**Status:** KUTMOQDA

- [ ] Breakpointlar: 320–479, 480–767, 768–1023, 1024–1439, 1440+
- [ ] Mobil alohida loyihalangan (desktop kichraytirilgani EMAS)
- [ ] Mobilda: kursor yo'q, kam meva, sodda motion, WebGL yo'q, kamaytirilgan parallax
- [ ] Gorizontal overflow yo'q
- [ ] Layout shift yo'q
- [ ] Scroll lock buglari yo'q
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 10 — SEO

**Status:** KUTMOQDA

- [ ] `metadata` har sahifada, mahsulot va yangilik sahifalari unikal
- [ ] OpenGraph + Twitter card
- [ ] `sitemap.ts`, `robots.ts`, canonical
- [ ] Structured data: Product, Organization, Article, Breadcrumb
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 11 — PERFORMANCE

**Status:** KUTMOQDA

- [ ] Hamma rasmlar `next/image`, WebP/AVIF, responsive `sizes`
- [ ] Hero rasm `priority`, qolganlari lazy
- [ ] Dynamic import — og'ir bo'limlar uchun
- [ ] Three.js (agar ishlatilsa) global yuklanmaydi, faqat kerakli bo'limda
- [ ] Video: `poster`, `preload="metadata"`, `muted`, `playsInline`; mobilga 4K yuklanmaydi
- [ ] Code splitting tekshirilgan, bundle hajmi ko'rib chiqilgan
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 12 — FINAL POLISH

**Status:** KUTMOQDA

- [ ] Brendlangan 404: `404 / NOTHING FRESH HERE / [BACK HOME]`
- [ ] Forma xato holati: "Something went wrong. Please try again."
- [ ] `prefers-reduced-motion` to'liq: float, kursor, katta parallax, murakkab tranzitsiyalar o'chadi — sayt to'liq ishlaydi
- [ ] Accessibility: semantik HTML, klaviatura navigatsiyasi, ko'rinadigan focus, alt, aria-label, to'g'ri button/anchor, kontrast
- [ ] 3 ta BARFF signature motion butun saytda seziladi: FLOAT, FLOW, SNAP
- [ ] **Liquid effekt** — imzo detali sifatida 1–2 joyda (sahifa o'tishi, hero foni yoki mahsulot reveal). SVG morph / blob. Hamma joyda ISHLATILMAYDI
- [ ] Test: 1440, 1920, tablet, iPhone, Android, sekin internet, Safari/Chrome/Firefox
- [ ] Console'da xato yo'q, hydration xatosi yo'q, buzuq rasm yo'q
- [ ] `npm run lint && npm run build` — toza

---

## 2. BAJARILGAN ISHLAR JURNALI

> Claude Code har bosqich oxirida shu yerga 1–3 qator qo'shadi: sana, bosqich, nima qilindi, nima qoldi.

<!-- LOG START -->

### 2026-08-26 — Phase 4: Hero ✅

- `Hero.tsx` (~100vh) — tuzilma: BARFF → sarlavha → subline/teglar → mahsulot → CTA →
  scroll indikatori. `HeroProduct.tsx` (kirish + float + kursor tilt uch alohida qatlamda,
  bir-birining transform'ini bosmaydi), `FloatingFruit.tsx` (`src,x,y,scale,rotation,speed,
  parallax` + `mobile`), `HeroParticles.tsx` (ixtiyoriy, standart holatda O'CHIQ).
- **Timeline brauzerda o'lchandi** (loader tugagandan keyin, spec bilan taqqoslab):
  fon 113ms · logo 218 · sarlavha 429 · stagger 639 · mahsulot 850 · CTA 1269 · scroll 1269 —
  hammasi spec qiymatidan <100ms chetlanishda, tartib to'g'ri. Mahsulot `scale 0.65→1`,
  `rotate -8°→0`; float 1.5s da boshlanadi (0 → −14px → 0, davr 3.5s, uzluksiz).
- Kursorga reaksiya o'lchandi: sichqoncha o'ngda/chapda `rotateY` ±9.4°,
  tepada/pastda `rotateX` ∓9.1° (maks 10°), `quickTo` bilan yumshatilgan, faqat
  `hover: hover and pointer: fine` da (`gsap.matchMedia`).
- Vizual ierarxiya tekshirildi: mahsulot markazida `elementFromPoint` → MAHSULOT,
  dekor `-z-10` da orqada, zarrachalar maks opacity 0.25.
- Mobil alohida sozlandi: hero aynan 844px = 100vh (390×844), mevalar 4 → 2,
  kursor tilt o'chiq, gorizontal overflow yo'q. `prefers-reduced-motion` da butun
  timeline bir zumda tugaydi, float va zarrachalar o'chadi.
- **Loader bilan integratsiya:** `lib/intro-store.ts` + `useIntroFinished()` qo'shildi.
  Ilgari hero timeline'i loader ORTIDA o'ynab tugardi va foydalanuvchi uni ko'rmasdi —
  endi Loader tugagach boshlanadi.
- Kontent: `data/hero.ts` — sarlavha, subline, mahsulot rasmi, mevalar va teglar
  BO'SH/`null`, hammasi `[CLIENT CONTENT REQUIRED]` bilan belgilangan. Rasm yo'qligida
  soxta 3D yoki soxta dekor QURILMADI (14-qoida) — neytral placeholder ko'rinadi va
  harakat mantiqi bir xil qoladi. Mevalar/zarrachalar vaqtinchalik sinov ma'lumoti bilan
  tekshirilib, keyin ma'lumot qaytarib olindi.
- Tuzatilgan ikki nuqson: zarrachalar o'zining 6–12s suzish davri bo'yicha fade bo'lib
  amalda ko'rinmasdi (ko'rinish va suzish ajratildi); mobilda hero 1182px bo'lib
  100vh dan oshib ketardi (mahsulot placeholder'i va bo'shliqlar mobil uchun kichraytirildi).
- `/dev-motion` sinov sahifasi rejaga muvofiq O'CHIRILDI (git tarixida qoladi).
- Global `pt-24` layout'dan olib tashlandi — Header shaffof holda hero ustidan tushadi.
- **Bloklovchi:** hero "premium" his qilishi uchun mahsulot fotosurati, sarlavha matni va
  brend ranglari kerak. Motion va tuzilma tayyor — assetlar kelgach faqat `data/hero.ts`
  va `@theme` bloki to'ldiriladi.

### 2026-08-26 — Phase 3: Motion System ✅

- **Lenis + GSAP ticker + ScrollTrigger** (`SmoothScrollProvider.tsx`): Lenis `autoRaf: false`
  bilan ishga tushadi va faqat `gsap.ticker` tomonidan yuritiladi, `lenis.on('scroll',
  ScrollTrigger.update)` ulanadi, `lagSmoothing(0)` qo'yiladi. `globals.css` ga Lenis'ning
  majburiy CSS qoidalari qo'shildi (ularsiz native smooth scroll bilan to'qnashadi).
  `useLockBodyScroll` endi Lenis'ni ham to'xtatadi — overlay yopilganda sahifa sakramaydi.
- `lib/gsap.ts` — plaginlar (ScrollTrigger, SplitText) bir joyda ro'yxatdan o'tadi.
- `lib/animations.ts` — `fadeUp()`, `revealText()`, `imageReveal()`, `parallax()`,
  `magnetic()`, `horizontalScroll()`, `pageTransition()`. Barcha davomiylik/easing
  `lib/motion.ts` dan; `MAGNETIC_RETURN`, `LENIS`, `MARQUEE`, `CURSOR`, `IMAGE_REVEAL`
  konstantalari qo'shildi. Phase 2 dagi `PageTransition.tsx` shu `pageTransition()` ga o'tkazildi.
- Komponentlar: `Reveal`, `TextReveal`, `SplitText` (GSAP SplitText ustida — `aria-label`
  saqlanadi, bo'laklar `aria-hidden`), `ImageReveal`, `Parallax`, `MagneticButton`,
  `HorizontalScroll`, `Marquee`, `Cursor` (OPEN → / VIEW / PLAY / DRAG ↔).
- `/dev-motion` sinov sahifasi (noindex). **Phase 4 tugagunicha saqlanadi**, keyin o'chiriladi.
- Brauzerda amalda tekshirildi (build emas): SplitText 4 qator + mask, Reveal stagger,
  ImageReveal `inset(0%)` + scale 1, parallaks tezliklari ierarxiyasi (bg 11.6 < image 28.7 <
  fruit 50.9 px), Marquee hover'da 30.7 → 7.5 px/700ms (sekinlashdi, to'xtamadi),
  magnit 11.5px tortdi va 0 ga qaytdi, kursor 4 holati 64px gacha kengaydi,
  HorizontalScroll 0 → −1632px (aynan `scrollWidth − innerWidth`),
  `prefers-reduced-motion` da Lenis/kursor/marquee/pin o'chadi, modal ochilib-yopilganda
  scroll sakramaydi, sahifadan chiqilganda `pin-spacer` qoldig'i qolmaydi. JS xatosi yo'q.
- **Double-scroll tasdiqlandi:** bitta `wheel` (delta 300) → yakuniy `scrollY` 299 (600 emas),
  12 kadr monotonik interpolyatsiya. Lenis glide paytida pin qilingan lenta `dx/dy = −1.0000`,
  maksimal chetlanish `0.0000` (39 kadr) — ScrollTrigger Lenis bilan bir kadrda yangilanadi.
- **Tuzatilgan bug:** kursorning Tailwind arbitrary variant'i (`[@media(hover:hover)and(pointer:fine)]`)
  bo'shliqsiz yaroqsiz CSS chiqargan — element `display:none` da qolib, ayni paytda
  `cursor: none` ishlagan, ya'ni desktopda umuman kursor yo'q edi. Nomlangan
  `@custom-variant pointer-fine` ga o'tkazildi va `cursor: none` endi `Cursor` haqiqatda
  ishga tushganda qo'yiladigan `data-custom-cursor` atributiga bog'landi.

### 2026-08-26 — Phase 2: Layout ✅

- `Header.tsx` — tepada shaffof, scroll'dan keyin `data-scrolled` orqali blur + kichrayadi;
  pastga scroll → yashirinadi, tepaga → qaytadi. Menyu ochiq bo'lsa yashirinmaydi.
  Animatsiya bir marta `gsap.context()` da quriladi, `gsap.quickTo()` bilan boshqariladi.
- `MobileMenu.tsx` — to'liq ekran overlay (side drawer emas): clip-path pastdan yuqoriga,
  havolalar stagger bilan, katta typography, focus trap + scroll lock, yopilish
  animatsiyasi tugagach unmount.
- `Footer.tsx` — ulkan BARFF logotipi (`clamp(4rem,19vw,20rem)`), navigatsiya, faqat mavjud
  ijtimoiy havolalar, til almashtirgich. `footerNavigation` bo'sh bo'lgani uchun huquqiy
  havolalar o'rnida `[CLIENT CONTENT REQUIRED]`.
- `PageTransition.tsx` — brend rangli overlay yopib-ochadi (~700ms, 500–900ms oralig'ida),
  birinchi yuklashda ishlamaydi (u yerda Loader bor).
- `Loader.tsx` — `BARFF` + 0% → 100%: birinchi kirishda 1.4s, sessiyada takroriy kirishda 0.6s.
- `LanguageSwitcher.tsx` (UZ/RU/EN), `Button.tsx` (4 variant × 3 o'lcham, `href` bo'lsa
  havola sifatida render qiladi), `Modal.tsx` (portal + focus trap + Escape + backdrop),
  qo'shimcha `SkipLink.tsx`.
- i18n arxitekturasi: `lib/i18n.ts` + `data/locales/{uz,ru,en}.ts`. `uz` — manba nusxa,
  `Dictionary` tipi orqali qolgan tillar majburan bir xil tuzilmada. Komponentda `t.nav.products`
  ko'rinishida — alohida til nusxalari yo'q. `data/navigation.ts` endi matn emas, `labelKey` saqlaydi.
- Yangi hook'lar: `useScrollDirection`, `usePrefersReducedMotion`, `useFocusTrap`,
  `useLockBodyScroll` (bir nechta overlay uchun hisoblagichli), `useAnimatedPresence`, `useIsClient`.
- Brauzerda tekshirildi (Chromium 1440×900 va 390×844): Header yashirinishi/qaytishi,
  menyu ochilish-yopilishi va fokus tsikli, til almashishi + reload'dan keyin saqlanishi
  (`html lang` ham yangilanadi), Modal'ning Escape/backdrop/focus-trap'i,
  `prefers-reduced-motion` rejimi. Hydration xatosi va JS xatosi yo'q.
- **Qoldi:** konsolda `/products`, `/about`, `/story`, `/news`, `/contact` uchun `next/link`
  prefetch 404'lari — bu sahifalar Phase 8 da quriladi, o'shanda yo'qoladi.

### 2026-08-26 — Phase 1: Setup & Design System ✅

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4 skeleti ildizda qurildi
  (`create-next-app` emas — papka bo'sh emas edi). Deps: `gsap`, `lenis`, `framer-motion`,
  `lucide-react`. Konfiglar: `tsconfig.json` (`@/*` alias), `next.config.ts` (AVIF/WebP),
  `postcss.config.mjs`, `eslint.config.mjs` (Next 16 native flat config), `.gitignore`.
- Design system: `styles/globals.css` — `@theme` ichida rang/radius/container/typography/motion
  tokenlari, `container-barff`, `text-hero`, `text-section` utility'lari, `prefers-reduced-motion`
  bazasi. Shriftlar `next/font/google` orqali: Manrope (display) + Inter (body), self-hosted.
- `lib/motion.ts` (DURATION / EASE / STAGGER / PARALLAX / HERO_TIMELINE), `lib/types.ts`
  (`Product`, `Category`, `NewsItem`, `NavItem`, `SocialLink`, `Localized` …), bo'sh tiplangan
  `data/{products,categories,news,navigation,social}.ts` selector funksiyalari bilan.
- Fayl tartibi: `BUILD PLAN.md` → `BUILD_PLAN.md` (0-bo'lim shu nomni talab qiladi), bayt-ma-bayt
  bir xil dublikat `BUILD PLAN-1.md` o'chirildi, `CLAUDE.md` yaratildi (1-qoida uchun majburiy).
  `index.html` + `CNAME` (jonli "tez orada" sahifasi) tegilmadi.
- Kontent o'ylab topilmadi: mahsulot/kategoriya/yangilik massivlari bo'sh, ranglar neytral
  placeholder, hamma joyda `[CLIENT CONTENT REQUIRED]`. Yagona real ma'lumot — mavjud
  `index.html` dan olingan Instagram va Telegram havolalari.
- `npm run lint` va `npm run build` — toza. Vizual komponentlar qurilmadi (Phase 1 chegarasi).
- **Qoldi / bloklovchi:** to'liq mahsulot spetsifikatsiyasi (spec) repoda yo'q — `Product` tipi
  Phase 5/8 talablariga qarab yozildi, spec kelgach aniqlashtiriladi.


<!-- LOG END -->

---

## 3. OCHIQ SAVOLLAR / MIJOZDAN KUTILAYOTGAN

> Claude Code kerakli ma'lumot yetishmasa shu yerga yozib qo'yadi.

- [ ] BARFF logotipi (SVG)
- [ ] Mahsulot fotosuratlari (shaffof fon, yuqori sifat)
- [ ] Real mahsulot nomlari va kategoriyalar
- [ ] Brend ranglari (HEX)
- [ ] Zavod / ishlab chiqarish videosi
- [ ] Kompaniya tarixi va sanalar
- [ ] Aloqa ma'lumotlari (telefon, email, manzil)
- [ ] Ijtimoiy tarmoq havolalari
- [ ] Sotuv nuqtalari ro'yxati
- [ ] To'liq mahsulot spetsifikatsiyasi (spec) — `Product` tipidagi maydonlarni tasdiqlash uchun
- [ ] `index.html` ("tez orada") qachon Next.js sayti bilan almashtirilsin?
- [ ] Hero uchun: mahsulot fotosurati (shaffof fon) + sarlavha/subline matni + hero teglari
      — ularsiz hero "premium" his qilmaydi (`data/hero.ts` to'ldiriladi)
