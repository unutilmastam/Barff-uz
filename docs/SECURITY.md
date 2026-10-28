# Xavfsizlik holati (CLAUDE.md §12, S41)

Bu hujjat tekshirilgan va **o'lchangan** narsalarni yozadi: nima ishlaydi,
nima topildi va tuzatildi, nima ataylab qilinmadi.

## 1. Sarlavhalar (HTTP)

Barcha 5 ilova javob sarlavhalarini S41 da o'lchab tekshirildi.

| Sarlavha                     | API (`helmet`)  | web | admin | dealer |   delivery   |
| ---------------------------- | :-------------: | :-: | :---: | :----: | :----------: |
| `X-Content-Type-Options`     |       ✅        | ✅* |  ✅*  |  ✅*   |     ✅*      |
| `X-Frame-Options: DENY`      | ✅ (SAMEORIGIN) | ✅* |  ✅   |   ✅   |      ✅      |
| `Strict-Transport-Security`  |       ✅        | ✅* |  ✅*  |  ✅*   |     ✅*      |
| `Content-Security-Policy`    |   ✅ (qat'iy)   | ✅* |  ✅*  |  ✅*   |     ✅*      |
| `Permissions-Policy`         |        —        | ✅* |  ✅*  |  ✅*   | ✅* (kamera) |
| `Referrer-Policy`            |       ✅        | ✅  |  ✅   |   ✅   |      ✅      |
| `Cross-Origin-Opener-Policy` |       ✅        | ✅* |  ✅*  |  ✅*   |     ✅*      |

`*` — S41 da qo'shildi. **Topilma:** ommaviy sayt (`web`) hech qanday
xavfsizlik sarlavhasiz ketayotgan edi; admin/diler/haydovchida faqat uchta
bor edi. Endi hammasi bitta joydan (`packages/config/src/security-headers.ts`)
beriladi va test yangi ilova yoki qayta yozilgan `headers()` uni unutib
qo'ymasligini tekshiradi.

**Ataylab yo'q:**

- **`script-src` bilan CSP.** Tema yaltirashining oldini oluvchi inline skript
  (CLAUDE.md §16) va Next gidratsiyasi `nonce` talab qiladi; noto'g'ri qo'ysak
  sayt jimgina ishlamay qoladi. Hozirgi CSP frame, base, object va form
  yo'nalishlarini yopadi. `nonce`li CSP — keyingi ish.
- **HSTS `preload`.** Qaytarib bo'lmaydigan qaror; domen egasi o'zi qilsin.
- **Kamera:** faqat haydovchi ilovasida (topshirish isboti surati, §6).
  Joylashuv va mikrofon hech qayerda ochilmaydi (§6: GPS talab qilinmagan).

## 2. CORS va cookie

O'lchandi (haqiqiy so'rovlar bilan):

- Ruxsat etilgan origin: `Access-Control-Allow-Origin` aynan o'sha origin,
  `Vary: Origin`, `credentials: true`.
- **Begona origin: `Access-Control-Allow-Origin` YO'Q** — brauzer javobni
  o'qiy olmaydi. Preflight ham ruxsat bermaydi.
- `*` qo'llab-quvvatlanmaydi (cookie bilan ishlaydigan so'rovda ruxsat etilmaydi).
- Cookie: `HttpOnly`, production'da `Secure` (o'chirib bo'lmaydi).

## 3. Bog'liqliklar (`pnpm audit --prod`)

**S41 boshida: 27 ta zaiflik — 1 kritik, 14 yuqori, 9 o'rtacha, 3 past.**
**Endi: 0.**

| Paket                                                             | Zaiflik                                                                                                         | Qanday tuzatildi                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `next` (4 ilova)                                                  | **KRITIK:** rasm optimallashtirishda autentifikatsiyasiz masofadan kod bajarish; App Router DoS; kesh zaharlash | `^15.5.28`                          |
| `sharp`                                                           | libvips / libheif / librsvg zaifliklari (rasm yuklash shu orqali)                                               | `^0.35.5`                           |
| `multer`                                                          | fayl yuklashda DoS (5 ta e'lon)                                                                                 | override `^2.5.0`                   |
| `body-parser`, `qs`                                               | DoS / ushlanmagan xato                                                                                          | override                            |
| `zod`                                                             | katta kolleksiyani tekshirishda xotira tugashi                                                                  | `^4.6.7`                            |
| `postcss`, `source-map-js`, `js-yaml`, `fast-uri`, `deepmerge-ts` | tranzit zaifliklar                                                                                              | `pnpm-workspace.yaml` → `overrides` |

Override'lar `pnpm-workspace.yaml` da. Yangilash hech narsani buzmaganini
tekshirish: format, lint, typecheck, 600 ta API testi, `pnpm build`, brauzerda
to'liq zanjir (S39 darvozasi).

**CI** (`security` ishi): har pushda `pnpm audit --prod --audit-level=high`.
Eslatma: bu yangi e'lon qilingan zaiflik tufayli kod o'zgarmasa ham
yiqilishi mumkin — bu xato emas, signal: paketni yangilang.

## 4. Sirlar

- `scripts/check-secrets.mjs` — kuzatiladigan fayllar **va butun git tarixi**
  (kalit, token, JWT, bazaga parolli ulanish satri, `.env`/`.pem` fayllari).
  Topilma QIYMATI chiqishga yozilmaydi.
- **Natija: toza** (703 fayl, butun tarix).
- Skanerning o'zi tekshirildi: vaqtinchalik repoga sir qo'yib, keyin
  o'chirdim — hozirgi fayllar toza, lekin `--history` baribir topdi.
- Istisno faqat test fayllari va skanerning o'zi (sababi kodda).
- CI'da har pushda ishlaydi. **To'liq vosita** (gitleaks) o'rnini bosmaydi.
- QA skriptlarida admin paroli kodga yozilgan edi — S39 da olib tashlandi.

Sir TUSHIB QOLSA: `docs/RUNBOOK.md` §6.

## 5. Rate limit — marshrut sinflari

| Sinf                                          | Chegara                                                     |
| --------------------------------------------- | ----------------------------------------------------------- |
| Umumiy API                                    | 120 so'rov / 60 s (IP bo'yicha), `API_RATE_LIMIT_*`         |
| Diler ro'yxatdan o'tish (`/dealers/register`) | 5 / soat                                                    |
| B2B ariza (`/leads`)                          | 5 / soat                                                    |
| Kirish (`/auth/login`)                        | akkaunt va IP bo'yicha urinishlar chegarasi + blok (bazada) |
| `/health`                                     | chegarasiz (monitoring)                                     |
| **Ommaviy rasm (`/media/public/…`)**          | **chegarasiz** — S41 da o'zgartirildi                       |

**Topilma:** rasm so'rovlari umumiy limitga hisoblanardi — 130 ketma-ket
so'rovdan 10 tasi `429` bergan; ko'p rasmli sahifada rasmlar sinardi.
Brauzer rasmni bir yil keshlaydi, yo'l faqat diskdan o'qiydi va qat'iy
shaklga tekshiriladi, shuning uchun limitdan chiqarildi (testi bor).

Limit instansiya xotirasida (Q19); asosiy qatlam — Cloudflare/provayder WAF.

## 6. Kuzatuv va ogohlantirish (§21)

- **Tizim xatosi (500) → egasiga xabar.** `SystemAlertService`: adminlarga
  in-app, sozlangan Telegram/email'ga (`notifications.system` sozlamasi,
  Q26). Bir xil xato 10 daqiqada bir marta, umumiy chegara soatiga 20;
  xato XABARI va so'rov satri yuborilmaydi (shaxsiy ma'lumot sizishi mumkin) —
  faqat xato sinfi va `requestId`. Test hodisasida zanjir bazagacha tekshirildi.
- **Loglar:** JSON qatorlar, har so'rovda `requestId`; parol va tokenlar
  yashiriladi (`redact`).
- **Kirish urinishlari, bloklar, rol o'zgarishi:** audit jurnalida
  (`docs/AUDIT-POLICY.md`).
- **Tirikligini tekshirish:** `GET /api/v1/health` (jarayon) va
  `GET /api/v1/health/ready` (baza). Tashqi monitor (masalan UptimeRobot)
  `ready` ni har 5 daqiqada tekshirsin — bu API butunlay o'lganda
  ogohlantirishning yagona yo'li (o'zi o'lgan jarayon xabar yubora olmaydi).

## 7. Ataylab bajarilmadi

| Nima                        | Sabab                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| Admin uchun MFA             | ROADMAP'da ixtiyoriy; sxemada maydonlar tayyor, amalga oshirish yo'q (Q22 — qachon yoqish mijoz qarori) |
| Kam qoldiq uchun push-xabar | Qoldiq boshqaruv panelida va hisobotda ko'rinadi; push — keyingi ish                                    |
| `nonce`li CSP               | §1 ga qarang                                                                                            |
| Cloudflare WAF qoidalari    | Mijozda Cloudflare bormi — noma'lum (Q20); qoidalar hisobiga bog'liq                                    |
| Konteyner skanerlash        | Docker ishlatilmaydi (cPanel/VPS, Q18)                                                                  |
