# OCHIQ SAVOLLAR — BARFF dan kutilayotgan ma'lumot

> Qoida (`CLAUDE.md` §1, §30): BARFF haqidagi faktlar **hech qachon o'ylab topilmaydi**.
> Ma'lumot yetishmasa kodda `MOCK` yoki `REPLACE_WITH_REAL_DATA` belgisi qo'yiladi
> va savol shu yerga yoziladi.
>
> Format: `| # | Savol | Qaysi qadam kutmoqda | Holat |`

| #   | Savol                                                                                                                                                                                                        | Qadam    | Holat |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----- |
| Q1  | `barff.uz` dagi hozirgi `index.html` ("tez orada") qachon va qanday almashtirilsin? Yangi sayt qo'shimcha domenga (staging) chiqadimi?                                                                       | S06, S21 | ochiq |
| Q2  | Brend ranglari — "BARFF green" ning aniq HEX qiymatlari va qo'shimcha palitra                                                                                                                                | S07      | ochiq |
| Q3  | Logotip (SVG, och va to'q fon uchun variantlari)                                                                                                                                                             | S07      | ochiq |
| Q4  | Shrift litsenziyasi — qaysi display/body shriftlar sotib olingan yoki ruxsat etilgan                                                                                                                         | S07      | ochiq |
| Q5  | Mahsulot fotosuratlari (shaffof fon, yuqori sifat) va 3D model (agar bor bo'lsa)                                                                                                                             | S09, S17 | ochiq |
| Q6  | Real mahsulot ro'yxati: nom, kategoriya, ta'm, hajm/variant, SKU/shtrix-kod                                                                                                                                  | S09      | ochiq |
| Q7  | Tarkib, ozuqaviy qiymat, saqlash sharti, yaroqlilik muddati                                                                                                                                                  | S09      | ochiq |
| Q8  | Sertifikatlar va hujjatlar (PDF) — qaysilari ommaviy, qaysilari yopiq                                                                                                                                        | S10      | ochiq |
| Q9  | Zavod/ishlab chiqarish foto va videosi                                                                                                                                                                       | S10, S13 | ochiq |
| Q10 | Kompaniya statistikasi (faqat TASDIQLANGAN raqamlar: quvvat, xodimlar, eksport)                                                                                                                              | S12      | ochiq |
| Q11 | Aloqa ma'lumotlari: manzil, telefon, email, ish vaqti                                                                                                                                                        | S13      | ochiq |
| Q12 | B2B lead qayerga yuborilsin? (Telegram / email / CRM) va kim javob beradi                                                                                                                                    | S14      | ochiq |
| Q13 | Diler darajalari (tier), chegirma qoidalari, minimal buyurtma miqdori                                                                                                                                        | S22, S23 | ochiq |
| Q14 | Hududiy narxlash va kredit limiti qo'llanadimi?                                                                                                                                                              | S23      | ochiq |
| Q15 | Omborlar ro'yxati va boshlang'ich qoldiqlar                                                                                                                                                                  | S30      | ochiq |
| Q16 | Yetkazib berish hududlari, haydovchilar va transport ma'lumotlari                                                                                                                                            | S32      | ochiq |
| Q17 | Hisob-faktura shakli va soliq/QQS qoidalari                                                                                                                                                                  | S36      | ochiq |
| Q18 | AWS akkaunti, domen boshqaruvi va Cloudflare kirish huquqlari                                                                                                                                                | S40      | ochiq |
| Q19 | Rate limiting instansiya xotirasida hisoblanadi — bir nechta ECS task'da amaldagi limit shuncha barobar oshadi. Taqsimlangan (Redis) hisoblagich kerakmi, yoki Cloudflare WAF darajasidagi himoya yetarlimi? | S41      | ochiq |
| Q20 | Production'da API oldida nechta proksi turadi (Cloudflare + ALB = 2)? `API_TRUST_PROXY_HOPS` aynan shu songa teng bo'lishi shart — xato qiymat rate limiter'ni chetlab o'tishga yo'l ochadi.                 | S40      | ochiq |
| Q21 | Dilerlar bitta ofis/NAT ortidan kirishadimi? Shunday bo'lsa, `AUTH_LOGIN_MAX_ATTEMPTS_PER_IP` (hozir 50) yetarlimi — bir ofisdagi bir necha xodim bir-birini bloklab qo'ymaydimi?                            | S22      | ochiq |
| Q22 | Admin uchun MFA qachon yoqilsin? Sxemada `mfaEnabled`/`mfaSecret` maydonlari tayyor, amalga oshirish esa hali yo'q (CLAUDE.md §12 buni ixtiyoriy deydi).                                                     | S41      | ochiq |

---

## Javob olingan savollar

_(hozircha yo'q)_
