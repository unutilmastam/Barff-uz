# OCHIQ SAVOLLAR — BARFF dan kutilayotgan ma'lumot

> Qoida (`CLAUDE.md` §1, §30): BARFF haqidagi faktlar **hech qachon o'ylab topilmaydi**.
> Ma'lumot yetishmasa kodda `MOCK` yoki `REPLACE_WITH_REAL_DATA` belgisi qo'yiladi
> va savol shu yerga yoziladi.
>
> Format: `| # | Savol | Qaysi qadam kutmoqda | Holat |`

| #   | Savol                                                                                                                                                                                                                                                                                                                     | Qadam    | Holat      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- |
| Q1  | `barff.uz` dagi hozirgi `index.html` ("tez orada") qachon va qanday almashtirilsin? Yangi sayt qo'shimcha domenga (staging) chiqadimi?                                                                                                                                                                                    | S06, S21 | ochiq      |
| Q2  | Brend ranglari. **QISMAN JAVOB:** logotip keldi va ranglar undan O'LCHAB olindi — to'q yashil `#003c18`, barg yashili `#0c7830`. Palitra shularga o'tkazildi. RASMIY HEX qiymatlari brendbukdan tasdiqlanishi kerak; logotipning **SVG yoki shaffof fonli** nusxasi ham kerak (hozirgisi oq fonli raster).                | S07      | qisman     |
| Q3  | Logotip (SVG, och va to'q fon uchun variantlari)                                                                                                                                                                                                                                                                          | S07      | ochiq      |
| Q4  | Shrift litsenziyasi — qaysi display/body shriftlar sotib olingan yoki ruxsat etilgan                                                                                                                                                                                                                                      | S07      | ochiq      |
| Q5  | Mahsulot fotosuratlari (shaffof fon, yuqori sifat) va 3D model (agar bor bo'lsa)                                                                                                                                                                                                                                          | S09, S17 | ochiq      |
| Q6  | Real mahsulot ro'yxati: nom, kategoriya, ta'm, hajm/variant, SKU/shtrix-kod                                                                                                                                                                                                                                               | S09      | ochiq      |
| Q7  | Tarkib, ozuqaviy qiymat, saqlash sharti, yaroqlilik muddati                                                                                                                                                                                                                                                               | S09      | ochiq      |
| Q8  | Sertifikatlar va hujjatlar (PDF) — qaysilari ommaviy, qaysilari yopiq                                                                                                                                                                                                                                                     | S10      | ochiq      |
| Q9  | Zavod/ishlab chiqarish foto va videosi                                                                                                                                                                                                                                                                                    | S10, S13 | ochiq      |
| Q10 | Kompaniya statistikasi (faqat TASDIQLANGAN raqamlar). Bosh sahifa va `/company` da AYNAN shu to'rt maydon kutmoqda, hozir `—` va `MOCK` belgisi bilan turibdi: tashkil etilgan yil, ishlab chiqarish quvvati, mahsulot turlari soni, yetkazib berish hududlari. Raqam o'ylab topilmaydi — javob kelmaguncha bo'sh qoladi. | S12      | ochiq      |
| Q11 | Aloqa ma'lumotlari: manzil, telefon, email, ish vaqti. `/contact` sahifasi tayyor va ularni CMS sozlamasidan (`site.contact`) o'qiydi; hozir seed'dagi `REPLACE_WITH_REAL_DATA` turibdi va u EKRANGA CHIQARILMAYDI — o'rniga "tasdiqlangandan keyin qo'shiladi" yozuvi ko'rinadi.                                         | S13      | ochiq      |
| Q12 | B2B lead qayerga yuborilsin? (Telegram / email / CRM) va kim javob beradi. Oqim TAYYOR: manzillar `notifications.lead` sozlamasidan o'qiladi (`telegramChatId`, `email`), hozir `REPLACE_WITH_REAL_DATA` turibdi va bu holatda xabar YUBORILMAYDI. SALES rolidagi foydalanuvchilar in-app bildirishnoma oladi.            | S14      | ochiq      |
| Q13 | Diler darajalari (tier), chegirma qoidalari, minimal buyurtma miqdori                                                                                                                                                                                                                                                     | S22, S23 | ochiq      |
| Q14 | Hududiy narxlash va kredit limiti qo'llanadimi?                                                                                                                                                                                                                                                                           | S23      | ochiq      |
| Q15 | Omborlar ro'yxati va boshlang'ich qoldiqlar                                                                                                                                                                                                                                                                               | S30      | ochiq      |
| Q16 | Yetkazib berish hududlari, haydovchilar va transport ma'lumotlari                                                                                                                                                                                                                                                         | S32      | ochiq      |
| Q17 | Hisob-faktura shakli va soliq/QQS qoidalari                                                                                                                                                                                                                                                                               | S36      | ochiq      |
| Q18 | Joylash muhiti. **JAVOB KELDI:** hostmaster.uz cPanel — Node.js App, PostgreSQL, SSH va Terminal BOR; Redis, S3 va Docker YO'Q; ulushli (shared) tarif. Ikki narsa qurilishi kerak (pastga qarang), ikki savol ochiq: Node versiyasi va xotira chegarasi.                                                                 | S21, S40 | qisman     |
| Q19 | Rate limiting instansiya xotirasida hisoblanadi — bir nechta ECS task'da amaldagi limit shuncha barobar oshadi. Taqsimlangan (Redis) hisoblagich kerakmi, yoki Cloudflare WAF darajasidagi himoya yetarlimi?                                                                                                              | S41      | ochiq      |
| Q20 | Production'da API oldida nechta proksi turadi (Cloudflare + ALB = 2)? `API_TRUST_PROXY_HOPS` aynan shu songa teng bo'lishi shart — xato qiymat rate limiter'ni chetlab o'tishga yo'l ochadi.                                                                                                                              | S40      | ochiq      |
| Q21 | Dilerlar bitta ofis/NAT ortidan kirishadimi? Shunday bo'lsa, `AUTH_LOGIN_MAX_ATTEMPTS_PER_IP` (hozir 50) yetarlimi — bir ofisdagi bir necha xodim bir-birini bloklab qo'ymaydimi?                                                                                                                                         | S22      | ochiq      |
| Q22 | Admin uchun MFA qachon yoqilsin? Sxemada `mfaEnabled`/`mfaSecret` maydonlari tayyor, amalga oshirish esa hali yo'q (CLAUDE.md §12 buni ixtiyoriy deydi).                                                                                                                                                                  | S41      | ochiq      |
| Q23 | `/privacy` va `/terms` matnlari. Bu huquqiy majburiyat yaratuvchi hujjatlar, shuning uchun matn O'YLAB TOPILMADI — sahifalar mavjud, `noindex` va o'rindosh bilan turibdi. Matn BARFF yuridik bo'limidan kelishi kerak.                                                                                                   | S13, S19 | ochiq      |
| Q24 | Mahsulot fotosurati. Hozir o'rindosh SVG maket ishlatiladi — bu BARFF shishasi EMAS. **BARFF studiyada, oq fonda tushirilgan rasmlarni yuborishini aytdi.** Kelgach o'rindoshlar almashtiriladi; 3D model endi TALAB QILINMAYDI (WebGL qatlami mahsulotni chizmaydi).                                                     | S17      | kutilmoqda |

---

## BARFF YUBORADIGAN MA'LUMOT — TO'LIQ RO'YXAT

BARFF barcha ma'lumotni bir safar yuborishini aytdi. Quyida aynan nima
kerakligi — shu ro'yxat bo'yicha yuborilsa, hech narsa qayta
so'ralmaydi.

### 1. Brend (Q2) — QISMAN KELDI

Logotip keldi. Ranglar undan o'lchab olindi va palitraga qo'yildi:

| Rang         | Qiymat    | Qayerda                                          |
| ------------ | --------- | ------------------------------------------------ |
| To'q yashil  | `#003c18` | Harflar, figuralar — yorug' ko'rinishdagi aksent |
| Barg yashili | `#0c7830` | Barg va yoy                                      |
| Ochiq yashil | `#3cb161` | Qorong'i ko'rinish uchun hisoblangan variant     |

Hali kerak:

- **Logotipning SVG yoki shaffof fonli nusxasi.** Hozirgisi oq fonli
  raster: qorong'i ko'rinishda oq quti bo'lib chiqadi. Avtomatik
  shaffoflashtirish sinab ko'rildi va ISHLAMADI — ko'ylak, galstuk va
  `B`/`A`/`R` harflarining ichi ham teshilib qoldi.
- **Rasmiy HEX qiymatlari** brendbukdan (o'lchangani taxminiy emas,
  lekin siqilgan rasmdan olingani uchun bir-ikki birlik farq qilishi
  mumkin).
- Shrift talabi bo'lsa — hozir Manrope + Inter.

**Tasdiqlangan fakt:** shior — "NATURAL BEVERAGES", va brend nomi
`BARFF®` (ro'yxatdan o'tgan belgi bilan).

### 2. Mahsulot fotosuratlari (Q24)

- Har bir mahsulot uchun **oq fonda**, studiyada tushirilgan shisha
  rasmi
- Eng kichik kenglik **1600 px** (sayt undan AVIF/WebP variantlarini
  o'zi tayyorlaydi)
- Fayl nomida mahsulot nomi bo'lsa yaxshi (`anor-1l.jpg`)
- Bo'lsa: qadoq (blok/karton) rasmi ham

### 3. Mahsulot ro'yxati (Q24 bilan birga)

Har bir mahsulot uchun:

- Nomi — **uz / ru / en**
- Ta'm va kategoriya
- Hajm variantlari (ml) va har biriga **SKU**, shtrix-kod bo'lsa
- Tarkibi va ozuqaviy qiymati — **faqat tasdiqlangan qiymatlar**
- Saqlash sharti va yaroqlilik muddati (kun)

### 4. Kompaniya raqamlari (Q10)

Bosh sahifa va `/company` aynan shu to'rttasini kutmoqda:

- Tashkil etilgan yil
- Ishlab chiqarish quvvati
- Mahsulot turlari soni
- Yetkazib berish hududlari

**Faqat tasdiqlangan raqamlar** — taxminiy qiymat yozilmaydi.

### 5. Aloqa (Q11)

- Manzil (va bo'lsa, xaritadagi nuqta)
- Telefon raqam(lar)i
- Email
- Ish vaqti
- Ijtimoiy tarmoq havolalari

### 6. Ariza qayerga tushsin (Q12)

- Telegram guruh/kanal yoki shaxsiy chat
- Email manzil(lar)i
- Kim javob beradi

### 7. Huquqiy matnlar (Q23)

- `/privacy` — maxfiylik siyosati
- `/terms` — foydalanish shartlari

Bular huquqiy majburiyat yaratadi, shuning uchun matn o'ylab
topilmaydi — yuridik bo'limdan kelishi kerak.

### 8. Sertifikatlar va hujjatlar

- Sertifikat skanlari (**PDF**) va har biriga: nomi, raqami, bergan
  tashkilot, amal qilish muddati
- Katalog PDF bo'lsa

### 9. Zavod materiallari

- Ishlab chiqarish jarayoni rasmlari (galereya va `/production` uchun)
- Video bo'lsa — bosh ekranda ishlatish mumkin

### 10. Hosting (Q18) — SKRINSHOT KELDI

**cPanel'da BOR:**

| Kerak                                 | Holat                               |
| ------------------------------------- | ----------------------------------- |
| `Setup Node.js App`                   | ✅ bor                              |
| `PostgreSQL Databases` + `phpPgAdmin` | ✅ bor                              |
| `SSH Access`, `Terminal`, `Cron Jobs` | ✅ bor                              |
| Redis                                 | ❌ yo'q                             |
| S3 / obyekt saqlash                   | ❌ yo'q                             |
| Docker                                | ❌ yo'q (ulushli tarifda bo'lmaydi) |

Tarif **ulushli** (`Shared IP Address 91.213.99.99`), cPanel 136.

**DIQQAT:** birlamchi domen `unutilmastam.uz`, `barff.uz` emas. Demak
`barff.uz` bu akkauntga qo'shimcha domen sifatida ulanishi kerak.

#### Redis yo'qligi — bu KESH masalasi EMAS

Redis'da ikkita XAVFSIZLIK holati saqlanadi:

- `refresh-token.store.ts` — refresh token'ni bekor qilish va qayta
  ishlatishni aniqlash (token oilasi)
- `login-attempt.service.ts` — parol tanlashga qarshi urinishlar
  hisobi (email va IP bo'yicha)

Ularni shunchaki o'chirib qo'yish **xavfsizlik tekshiruvini olib
tashlash** bo'lardi, bu esa `CLAUDE.md` §30 da taqiqlangan. Shuning
uchun ikki yo'l bor:

1. Hostdan Redis so'rash (ko'p cPanel provayderlari iltimosga ko'ra
   yoqadi).
2. **Shu ikki holatni PostgreSQL ga ko'chirish.** Bu shunchaki
   chetlab o'tish emas — hozir Redis qayta ishga tushsa BARCHA
   refresh token'lar yo'qoladi va hamma tizimdan chiqib ketadi.
   Bazada saqlansa bu muammo ham yo'qoladi.

Ikkinchi yo'l tanlandi: u hostdan mustaqil va mahsulotni yaxshilaydi.

#### S3 yo'qligi

Media quvuri (S08) S3 ga yozadi va production'da S3 sozlanmasa ilova
ATAYLAB ko'tarilmaydi. cPanel'da doimiy disk bor, shuning uchun
**fayl tizimi adapteri** qo'shiladi: rasmlar uy katalogida saqlanadi
va veb-server ularni beradi.

#### HALI IKKI SAVOL

1. `Setup Node.js App` da **qaysi Node versiyalari** bor? Kamida
   **20** kerak (afzali 22). cPanel'da o'sha bo'limni ochsangiz
   ro'yxat ko'rinadi.
2. Tarifda **qancha operativ xotira** va nechta jarayonga ruxsat bor?
   Uchta Node ilovasi (sayt, admin, API) birga ishlaydi — ulushli
   tarifda eng katta xavf shu. cPanel → `Metrics` → `Resource Usage`
   da ko'rinadi.

Javoblarga qarab: yetarli bo'lsa shu yerda joylashtiramiz, yetmasa —
o'sha provayderdan kichik VPS.

---

## Javob olingan savollar

_(hozircha yo'q)_
