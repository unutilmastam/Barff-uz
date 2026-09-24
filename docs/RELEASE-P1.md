# FAZA 1 — CHIQARISH HUJJATI

> Qamrov: ommaviy sayt (`barff.uz`) + admin CMS (`admin.barff.uz`) + ularni
> ta'minlaydigan API (`api.barff.uz`).
> Qadamlar: **S07–S21** (`ROADMAP.md`). Darvoza qadami: **S21**.
> Sana: 2026-09-24.

---

## 1. HOLAT: BIR QARASHDA

| Narsa                                      | Holat                                             |
| ------------------------------------------ | ------------------------------------------------- |
| Kod tayyorligi                             | ✅ tayyor — uchala kritik oqim brauzerda o'tdi    |
| Sifat darvozalari (lint, tip, test, build) | ✅ o'tadi                                         |
| Unumdorlik                                 | ✅ o'lchandi, chegaralardan ancha past            |
| Qulaylik (a11y)                            | ✅ axe 0 buzilish, klaviatura to'liq              |
| **Staging'ga joylash**                     | ⛔ **BAJARILMADI — AWS kirish huquqi yo'q (Q18)** |
| Haqiqiy kontent                            | ⛔ kutilmoqda (Q2, Q10, Q11, Q12, Q23, Q24)       |

**Ochiq aytilsin:** S21 ning "staging'ga joylash va smoke test" vazifasi
**bajarilmadi**. Buning sababi kodda emas: bu muhitda AWS akkaunti, domen
va Cloudflare boshqaruvi yo'q (`docs/OPEN-QUESTIONS.md`, Q18). Joylash
quvuri (GitHub Actions → ECR → ECS) S05 da yozilgan va CI'da tasvirlar
muvaffaqiyatli quriladi, lekin u hech qachon HAQIQIY muhitga
yugurtirilmagan. Shuning uchun "staging'da ishlayapti" deb ayta
olmayman — faqat "joylashga tayyor" deb aytaman.

---

## 2. FAZA 1 NIMANI O'Z ICHIGA OLADI

### Ommaviy sayt — 15 marshrut, uchala tilda (UZ / RU / EN)

`/` · `/company` · `/products` · `/products/[slug]` · `/production` ·
`/quality` · `/partners` · `/news` · `/news/[slug]` · `/gallery` ·
`/catalog` · `/contact` · `/become-partner` · `/privacy` · `/terms`

### Admin CMS — 13 ekran

Yangiliklar, sertifikatlar, galereya, hujjatlar, sahifalar va SEO,
media kutubxona, mahsulotlar, arizalar (ro'yxat + tafsilot), sozlamalar.

### API

`api.barff.uz/api/v1` — ommaviy kontent, media quvuri, arizalar,
autentifikatsiya va RBAC. Swagger `/api/docs` da.

---

## 3. NIMA TEKSHIRILDI (o'lchov bilan)

Quyidagilar **haqiqiy brauzerda** (Chromium + Playwright) o'lchandi,
koddan o'qib xulosa qilinmadi. Skriptlar `qa/` katalogida —
qayta yurgizish tartibi va ikkita muhit tuzog'i `qa/README.md` da.

### 3.1 Uchta kritik oqim (`CLAUDE.md` §24)

| Oqim                                    | Natija                                         |
| --------------------------------------- | ---------------------------------------------- |
| Tashrifchi B2B ariza yuboradi           | ✅ `POST /leads` → 202, tasdiq xabari ko'rindi |
| Admin panelga kiradi                    | ✅ kirish → `/`, sessiya HttpOnly cookie'da    |
| Ariza admin panelda ko'rinadi           | ✅ yuborilgan ariza ro'yxatda topildi          |
| Admin yangilik yaratadi va nashr qiladi | ✅ saqlandi                                    |
| Tahrir ommaviy API'da darhol ko'rinadi  | ✅ 200 (kesh bekor qilindi)                    |
| Tahrir SAYTDA ochiladi                  | ✅ 200, sarlavha to'g'ri                       |

### 3.2 Unumdorlik (`CLAUDE.md` §26)

5 marshrut × 2 o'lcham (360px va 1440px):

| Metrika | O'lchangan         | "Yaxshi" chegarasi |
| ------- | ------------------ | ------------------ |
| LCP     | 76–176 ms          | < 2500 ms          |
| CLS     | 0.0000 (hammasida) | < 0.1              |
| FCP     | 76–176 ms          | < 1800 ms          |
| TTFB    | 7–10 ms            | < 800 ms           |

Dastlabki JS (bosh sahifa): **207.5 KB gzip** / 662 KB siqilmagan.

**Bu raqamlar OPTIMISTIK.** O'lchov `localhost` da, tarmoq kechikishisiz
va sekin qurilmasiz qilingan. Haqiqiy foydalanuvchi raqamlari
Cloudflare orqali va mobil tarmoqda yuqoriroq bo'ladi. Haqiqiy
o'lchov staging chiqqandan keyin takrorlanishi kerak.

### 3.3 Og'ir kod kechiktirilganmi (`CLAUDE.md` §17)

| Tekshiruv                             | Natija            |
| ------------------------------------- | ----------------- |
| three.js dastlabki bundle'da          | ❌ yo'q (to'g'ri) |
| GSAP dastlabki bundle'da              | ❌ yo'q (to'g'ri) |
| 3D sahna keyin yuklanib ishga tushadi | ✅ 1 ta canvas    |
| GSAP ochilishlari keyin ishga tushadi | ✅ 4 ta bo'lim    |

Kutubxona borligi fayl **mazmunidan** qidirildi, chunki Next dinamik
importni hash'langan faylga joylaydi va nomida `gsap`/`three` so'zi
bo'lmaydi.

### 3.4 Qulaylik (`CLAUDE.md` §29)

| Tekshiruv                        | Qamrov                                | Natija                       |
| -------------------------------- | ------------------------------------- | ---------------------------- |
| axe-core (WCAG 2.1 A + AA)       | 15 marshrut × 2 o'lcham × 2 ko'rinish | 0 buzilish                   |
| Gorizontal skroll (360px)        | 15 marshrut                           | 0 px                         |
| Bitta `<h1>`                     | 15 marshrut                           | ✅                           |
| O'tkazib yuborish havolasi       | UZ / RU / EN                          | ✅ birinchi Tab              |
| Klaviatura bilan yurish          | 5 marshrut                            | 27–36 element, tiqilish yo'q |
| Har bir fokus ko'rinadi          | 5 marshrut                            | 0 ta ko'rinmas               |
| Fokus oldingi bo'limga qaytmaydi | 5 marshrut                            | 0 ta                         |
| Har bir rasmda `alt`             | 5 marshrut                            | ✅                           |
| `html lang` to'g'ri              | UZ / RU / EN                          | ✅                           |

### 3.5 Sifat darvozalari

Monorepo bo'ylab (`turbo`):

| Darvoza          | Natija                                             |
| ---------------- | -------------------------------------------------- |
| `pnpm lint`      | ✅ 11 vazifa — ESLint + tarjimasiz matn tekshiruvi |
| `pnpm typecheck` | ✅ 11 vazifa                                       |
| `pnpm test`      | ✅ 12 vazifa                                       |
| `pnpm build`     | ✅ 7 vazifa (production build)                     |

### 3.6 Xavfsizlik (oldingi qadamlarda tekshirilgan, hali kuchda)

- Token'lar `HttpOnly` cookie'da — `document.cookie` brauzerda bo'sh (S18).
- RBAC **serverda**: DRIVER 9 ta admin endpoint uchun 403 oladi, hatto
  brauzerdan to'g'ridan-to'g'ri `fetch` qilganda ham (S18).
- Ariza holat o'tishlari serverda ham qo'riqlanadi — panel ko'rsatmagan
  o'tish API'da ham rad etiladi (S20).
- Maqola matni oddiy matn sifatida chiziladi — `dangerouslySetInnerHTML`
  yo'q, ya'ni saqlangan XSS yo'li yopiq (S13).
- Media turi imzo baytlari bo'yicha aniqlanadi, SVG rad etiladi (S08).
- Soxta reyting, sharh yoki sertifikat tuzilgan ma'lumotlarga
  QO'SHILMAYDI va bu test bilan qoplangan (S15).

---

### 3.7 Darvozadan KEYIN qo'shilgani

**Yorug' ko'rinish (S21A).** Sayt dastlab faqat qorong'i edi
(`CLAUDE.md` §16). Buyurtmachi so'rovi bilan yorug' ko'rinish qo'shildi
va u endi teng huquqli variant: har bir sahifa ikkala ko'rinishda
tekshiriladi. Yo'l-yo'lakay MAVJUD qorong'i ko'rinishda ikkita kontrast
kamchiligi topilib tuzatildi (`docs/CHANGELOG-STEPS.md`, S21A qatori).

---

## 4. MA'LUM CHEKLOVLAR

Bular **kamchilik**, yashirilmaydi:

1. **Staging'ga joylanmagan (Q18).** Yuqoriga qarang.
2. **Galereya rasmlari lokalda ko'rinmaydi.** S3 sozlanmagan muhitda
   xotiradagi adapter `memory://` manzil qaytaradi va brauzer uni
   yuklay olmaydi. Production'da bu holat BO'LMAYDI — S3 sozlamasi
   yetishmasa ilova umuman ko'tarilmaydi (`storage.module.ts`).
3. **Dinamik sahifada 404 statusi 200 bo'lib qaytadi.** Next oqimi
   sarlavha yuborilgandan keyin statusni o'zgartira olmaydi. 404
   sahifasi ko'rinadi, lekin HTTP status 200. Bu qidiruv tizimi uchun
   noqulay; hal qilish yo'li — `generateStaticParams` qamrovini
   kengaytirish yoki middleware qo'shish (Faza 5 ga qoldirildi).
4. **Docker tasvirlari lokalda qurilmaydi** — bu muhitda daemon yo'q.
   CI'da quriladi va tekshiriladi.
5. **Unumdorlik raqamlari `localhost` dan.** §3.2 ga qarang.

---

## 5. HAQIQIY MA'LUMOT KUTILMOQDA

Sayt texnik jihatdan tayyor, lekin **haqiqiy kontentsiz**. Quyidagilar
BARFF dan kelishi kerak — hech biri o'ylab topilmadi (`CLAUDE.md` §1):

| #   | Nima kerak                                | Hozir nima turibdi                 |
| --- | ----------------------------------------- | ---------------------------------- |
| Q2  | "BARFF green" ning aniq HEX qiymatlari    | vaqtinchalik palitra               |
| Q10 | Kompaniya statistikasi (4 ta raqam)       | `—` va `MOCK` belgisi              |
| Q11 | Manzil, telefon, email, ish vaqti         | "tasdiqlangandan keyin qo'shiladi" |
| Q12 | Ariza qayerga yuborilsin (Telegram/email) | yuborilmaydi, bazaga yoziladi      |
| Q23 | `/privacy` va `/terms` huquqiy matni      | o'rindosh + `noindex`              |
| Q24 | Mahsulot `.glb` modeli yoki fotosurati    | koddan qurilgan mavhum shakl       |

Shuningdek katalogdagi mahsulotlar `[MOCK]` prefiksi bilan turibdi va
haqiqiy mahsulot ro'yxati bilan almashtirilishi kerak.

---

## 6. STAGING'GA JOYLASH — TAYYOR RETSEPT

AWS kirish huquqi (Q18) kelgach bajariladigan ishlar. Quvur S05 da
yozilgan, bu yerda faqat ketma-ketlik.

### 6.1 Kerakli infratuzilma

- RDS PostgreSQL 16 (**xususiy tarmoqda**, `CLAUDE.md` §12)
- ElastiCache Redis
- S3 bucket — **standart holatda yopiq**, ACL qo'yilmaydi
- ECR omborlari: `barff-api`, `barff-web`, `barff-admin`
- ECS Fargate klasteri + Application Load Balancer
- Secrets Manager — quyidagi sirlar

### 6.2 Sirlar (Secrets Manager, hech qachon repoda emas)

```
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SEED_ADMIN_PASSWORD        # faqat birinchi seed uchun
S3_ENDPOINT / S3_BUCKET / S3_REGION
S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
TELEGRAM_BOT_TOKEN         # Q12 hal bo'lgach
```

### 6.3 Ketma-ketlik

1. `main` ga merge → GitHub Actions testlarni yurgizadi.
2. Tasvirlar quriladi va ECR'ga yuklanadi (OIDC orqali, uzoq muddatli
   kalitsiz).
3. `pnpm --filter @barff/db migrate:deploy` — migratsiyalar.
4. Seed FAQAT bir marta, `SEED_ADMIN_PASSWORD` bilan.
5. ECS servislar yangilanadi (api → web → admin).
6. Cloudflare: DNS, SSL, WAF, kesh qoidalari.
7. §6.4 dagi smoke test.

### 6.4 Smoke test ro'yxati (staging chiqqach bajariladi)

- [ ] `GET /api/v1/health` → `{"status":"ok"}`
- [ ] Bosh sahifa uchala tilda ochiladi (`/uz`, `/ru`, `/en`)
- [ ] Mahsulot sahifasi ochiladi, rasm KO'RINADI (S3 tekshiruvi)
- [ ] `/become-partner` dan ariza yuboriladi → 202
- [ ] Ariza admin panelda ko'rinadi
- [ ] Admin kirish/chiqish ishlaydi
- [ ] Yangilik yaratiladi → saytda ko'rinadi
- [ ] `admin.barff.uz` `X-Robots-Tag: noindex` beradi
- [ ] `barff.uz/robots.txt` va `sitemap.xml` to'g'ri
- [ ] Mobil (360px) da gorizontal skroll yo'q
- [ ] Core Web Vitals HAQIQIY tarmoqda qayta o'lchanadi

---

## 7. DARVOZA XULOSASI

`ROADMAP.md` S21 darvozasi shunday yozilgan:

> "public site + CMS fully usable on staging in three languages on
> mobile and desktop"

**Qisman bajarildi.** "Sayt + CMS uchala tilda, mobil va desktopda to'liq
ishlaydi" qismi tasdiqlandi — lekin **lokal muhitda**, staging'da emas.
Darvozaning "on staging" qismi Q18 gacha ochiq qoladi.

Faza 2 (diler portali) **kod jihatdan bloklanmagan**: u Faza 1 ning
domen qatlamiga tayanadi, infratuzilmaga emas. Lekin BARFF uchun
ko'rinadigan natija — ishlayotgan sayt — Q18 ga bog'liq va shu sabab
u eng ustuvor ochiq savol.
