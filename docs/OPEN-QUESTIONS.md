# OCHIQ SAVOLLAR — BARFF dan kutilayotgan ma'lumot

> Qoida (`CLAUDE.md` §1, §30): BARFF haqidagi faktlar **hech qachon o'ylab topilmaydi**.
> Ma'lumot yetishmasa kodda `MOCK` yoki `REPLACE_WITH_REAL_DATA` belgisi qo'yiladi
> va savol shu yerga yoziladi.
>
> Format: `| # | Savol | Qaysi qadam kutmoqda | Holat |`

| #   | Savol                                                                                                                                                                                                                                                                                                                     | Qadam    | Holat      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- |
| Q1  | `barff.uz` dagi hozirgi `index.html` ("tez orada") qachon va qanday almashtirilsin? Yangi sayt qo'shimcha domenga (staging) chiqadimi?                                                                                                                                                                                    | S06, S21 | ochiq      |
| Q2  | Brend ranglari — "BARFF green" ning aniq HEX qiymatlari va qo'shimcha palitra                                                                                                                                                                                                                                             | S07      | ochiq      |
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
| Q18 | AWS akkaunti, domen boshqaruvi va Cloudflare kirish huquqlari. **ENG USTUVOR:** bu S21 (Faza 1 darvozasi) ning "staging'ga joylash" vazifasini BLOKLAYAPTI — kod tayyor, quvur yozilgan, lekin hech qayerga chiqarilmagan. Tayyor retsept va smoke test ro'yxati `docs/RELEASE-P1.md` §6 da.                              | S21, S40 | ochiq      |
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

### 1. Brend (Q2)

- Yashil rangning aniq **HEX** qiymati (va bo'lsa, qo'shimcha palitra)
- Logotip: **SVG** (afzal) yoki yuqori aniqlikdagi PNG, shaffof fonda
- Shrift talabi bo'lsa — hozir Manrope + Inter ishlatilyapti

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

### 10. Infratuzilma (Q18) — ENG USTUVOR

Sayt hozir hech qayerga chiqarilmagan. Buning uchun:

- AWS akkaunti
- `barff.uz` domen boshqaruvi
- Cloudflare kirish huquqi

Bularsiz sayt faqat lokal ishlaydi.

---

## Javob olingan savollar

_(hozircha yo'q)_
