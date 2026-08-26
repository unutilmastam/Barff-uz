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
| 1 | Setup & Design System | **IN PROGRESS** |
| 2 | Layout (Header / Menu / Footer) | KUTMOQDA |
| 3 | Motion System | KUTMOQDA |
| 4 | Hero | KUTMOQDA |
| 5 | Marquee / Categories / Showcase | KUTMOQDA |
| 6 | Philosophy / About / Story / Process | KUTMOQDA |
| 7 | Video / Reels / News / WhereToBuy / Contact | KUTMOQDA |
| 8 | Ichki sahifalar | KUTMOQDA |
| 9 | Responsive | KUTMOQDA |
| 10 | SEO | KUTMOQDA |
| 11 | Performance | KUTMOQDA |
| 12 | Final Polish | KUTMOQDA |

---

## PHASE 1 — SETUP & DESIGN SYSTEM

**Status:** IN PROGRESS

- [ ] Next.js (latest stable) + TypeScript + Tailwind CSS loyihasi
- [ ] Dependencies: `gsap`, `lenis`, `framer-motion`, `lucide-react`
- [ ] Papka strukturasi: `app/`, `components/`, `data/`, `lib/`, `hooks/`, `styles/`, `public/`
- [ ] `public/` ichida: `images/`, `products/`, `fruits/`, `videos/`, `textures/`, `icons/`, `fonts/`
- [ ] `globals.css` — CSS o'zgaruvchilar (`--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--radius-*`, `--container`)
- [ ] Typography: display shrift (Satoshi / Geist / Manrope) + body shrift (Inter / Geist Sans), `next/font` orqali
- [ ] Typography scale: hero `clamp(4rem, 10vw, 12rem)`, section `clamp(3rem, 7vw, 9rem)`, body 16–22px
- [ ] Responsive container utility: `width: min(100% - 40px, 1600px); margin-inline: auto;`
- [ ] `lib/motion.ts` — global motion konstantalari (micro 250–400ms, ui 400–700ms, section 800–1200ms, hero 1000–2000ms; easing: power2/3/4.out, expo.out)
- [ ] Bo'sh tiplangan data fayllari: `data/products.ts`, `categories.ts`, `news.ts`, `navigation.ts`, `social.ts`
- [ ] `Product` tipi spec'dagidek yozilgan
- [ ] `package.json` da `lint` va `build` scriptlari mavjud
- [ ] `npm run lint && npm run build` — toza

**MUHIM:** bu bosqichda Header, Hero yoki boshqa vizual komponentlar qurilmaydi.

---

## PHASE 2 — LAYOUT

**Status:** KUTMOQDA

- [ ] `components/layout/Header.tsx` — shaffof boshlanadi, scroll'dan keyin blur + kichrayadi
- [ ] Header scroll xatti-harakati: pastga → yashirin, tepaga → ko'rinadi (GSAP)
- [ ] `components/layout/MobileMenu.tsx` — to'liq ekran overlay, clip-path, stagger, katta typography (side drawer EMAS)
- [ ] `components/layout/Footer.tsx` — ulkan BARFF logotipi, navigatsiya, ijtimoiy havolalar (faqat mavjudlari)
- [ ] `components/layout/PageTransition.tsx` — brend rangli overlay, 500–900ms
- [ ] `components/ui/Loader.tsx` — `BARFF 0% → 100%`, maks 1–1.5s, takroriy navigatsiyada qisqaroq
- [ ] `components/ui/LanguageSwitcher.tsx` — UZ / RU / EN
- [ ] `lib/i18n.ts` + `data/locales/{uz,ru,en}.ts` — tarjima arxitekturasi. Har til uchun alohida komponent nusxasi QILINMAYDI
- [ ] `components/ui/Button.tsx` — variantlar bilan
- [ ] `components/ui/Modal.tsx` — qayta ishlatiladigan, focus trap bilan
- [ ] `data/navigation.ts` dan menyu o'qiladi (hardcode EMAS)
- [ ] `prefers-reduced-motion` hurmat qilinadi
- [ ] `npm run lint && npm run build` — toza

---

## PHASE 3 — MOTION SYSTEM

**Status:** KUTMOQDA

- [ ] Lenis + GSAP ticker + `ScrollTrigger.update()` to'g'ri sinxronlangan (double-scroll bug yo'q)
- [ ] `components/animation/Reveal.tsx`
- [ ] `components/animation/TextReveal.tsx` + `SplitText.tsx`
- [ ] `components/animation/ImageReveal.tsx` — `scale 1.15` → clip-path reveal → `scale 1`
- [ ] `components/animation/Parallax.tsx` — turli tezliklar (bg 0.1 / image 0.25 / fruit 0.45)
- [ ] `components/animation/MagneticButton.tsx` — maks 8–15px siljish, spring qaytish
- [ ] `components/sections/Marquee.tsx` — cheksiz loop, hover'da sekinlashadi (to'xtamaydi)
- [ ] `components/animation/HorizontalScroll.tsx` — pin + dinamik kenglik hisobi
- [ ] `components/ui/Cursor.tsx` — faqat desktop; OPEN → / VIEW / PLAY / DRAG ↔ holatlari
- [ ] `lib/animations.ts` — `fadeUp()`, `revealText()`, `imageReveal()`, `parallax()`, `magnetic()`, `horizontalScroll()`, `pageTransition()`
- [ ] Har bir animatsiya `gsap.context()` ichida, unmount'da `revert()`
- [ ] Sinov sahifasi (`/dev-motion`) yaratilib, hammasi tekshirilgan
- [ ] `npm run lint && npm run build` — toza

> Bu bosqich tugamaguncha Phase 4 ga o'tilmaydi. Motion tizimi butun saytning poydevori.

---

## PHASE 4 — HERO

**Status:** KUTMOQDA

- [ ] `components/hero/Hero.tsx` — ~100vh
- [ ] Tuzilma: BARFF → sarlavha → mahsulot → tag'lar → scroll indikatori
- [ ] `components/hero/HeroProduct.tsx` — float, subtle rotate, kursorga reaksiya (`mouseX → rotateY`, `mouseY → rotateX`, smoothing bilan)
- [ ] `components/hero/FloatingFruit.tsx` — props: `src, x, y, scale, rotation, speed, parallax`
- [ ] `components/hero/HeroParticles.tsx` (ixtiyoriy, ortiqcha shovqin bo'lmasin)
- [ ] Timeline: 0.0s fon → 0.2s logo → 0.4s sarlavha → 0.6s stagger → 0.8s mahsulot (`scale 0.65→1`, `rotate -8°→0`) → 1.0s meva → 1.2s CTA → 1.5s float boshlanadi
- [ ] Mahsulot har doim asosiy vizual fokus — dekor uni bosib ketmasin
- [ ] Matnlar `data/` dan keladi va oson almashtiriladi
- [ ] Mobil versiyasi alohida sozlangan (kam meva, sodda motion)
- [ ] `npm run lint && npm run build` — toza

> **Hero "premium" his qilmaguncha keyingi bosqichga o'tilmaydi.**

---

## PHASE 5 — MARQUEE / CATEGORIES / PRODUCT SHOWCASE

**Status:** KUTMOQDA

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
